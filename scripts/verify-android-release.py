"""Fail CI on an invalid upload bundle. Uses only Python stdlib and JDK tools."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ANDROID = "{http://schemas.android.com/apk/res/android}"


def run(*args):
    result = subprocess.run([str(a) for a in args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"{Path(str(args[0])).name} validation failed:\n{result.stdout}\n{result.stderr}")
    return result.stdout


def certificate(pem):
    match = re.search(r"-----BEGIN CERTIFICATE-----\s*(.*?)\s*-----END CERTIFICATE-----", pem, re.S)
    if not match:
        raise RuntimeError("No signing certificate found")
    return base64.b64decode(match.group(1))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundletool", required=True)
    parser.add_argument("--bundle", default="android/app/build/outputs/bundle/release/app-release.aab")
    args = parser.parse_args()
    bundle = (ROOT / args.bundle).resolve()
    java_bin = Path(os.environ["JAVA_HOME"]) / "bin"
    java = java_bin / ("java.exe" if os.name == "nt" else "java")
    keytool = java_bin / ("keytool.exe" if os.name == "nt" else "keytool")
    jarsigner = java_bin / ("jarsigner.exe" if os.name == "nt" else "jarsigner")
    tool = Path(args.bundletool).resolve()
    run(java, "-jar", tool, "validate", f"--bundle={bundle}")
    manifest = ET.fromstring(run(java, "-jar", tool, "dump", "manifest", f"--bundle={bundle}", "--module=base"))
    uses_sdk = manifest.find("uses-sdk")
    assert uses_sdk is not None, "Missing uses-sdk"
    source = (ROOT / "android/app/build.gradle").read_text()
    expected_code = int(re.search(r"versionCode\s+(\d+)", source).group(1))
    assert expected_code >= 160, "Release code must be at least 160"
    expected = {
        "package": "com.mastergrowbot.app",
        ANDROID + "versionName": "2.0",
        ANDROID + "versionCode": str(expected_code),
    }
    for name, value in expected.items():
        assert manifest.get(name) == value, f"Unexpected {name}: {manifest.get(name)}"
    assert uses_sdk.get(ANDROID + "minSdkVersion") == "24", "Play protection requires minSdk 24"
    assert uses_sdk.get(ANDROID + "targetSdkVersion") == "36", "Unexpected target SDK"
    config = json.loads(run(java, "-jar", tool, "dump", "config", f"--bundle={bundle}"))
    assert "PAGE_ALIGNMENT_16K" in json.dumps(config), "Bundle must request 16 KB APK alignment"
    verification = run(jarsigner, "-J-Duser.language=en", "-verify", bundle)
    assert "jar verified." in verification, "AAB signature did not verify"
    signed_cert = certificate(run(keytool, "-printcert", "-jarfile", bundle, "-rfc"))
    expected_cert = certificate(run(
        keytool, "-exportcert", "-rfc", "-keystore", os.environ["CM_KEYSTORE_PATH"],
        "-alias", os.environ["CM_KEY_ALIAS"], "-storepass:env", "CM_KEYSTORE_PASSWORD"))
    assert signed_cert == expected_cert, "AAB signer does not match configured upload key"
    sdk = os.environ.get("ANDROID_SDK_ROOT") or os.environ.get("ANDROID_HOME")
    if not sdk:
        properties = (ROOT / "android/local.properties").read_text()
        sdk = re.search(r"^sdk.dir=(.+)$", properties, re.M).group(1).strip()
    zipalign = Path(sdk) / "build-tools/36.0.0" / ("zipalign.exe" if os.name == "nt" else "zipalign")
    with tempfile.TemporaryDirectory(prefix="mastergrowbot-bundle-") as folder:
        archive_path = Path(folder) / "release.apks"
        store_password = Path(folder) / "store-password"
        key_password = Path(folder) / "key-password"
        for path, variable in [(store_password, "CM_KEYSTORE_PASSWORD"), (key_password, "CM_KEY_PASSWORD")]:
            path.touch(mode=0o600)
            path.write_text(os.environ[variable])
        run(java, "-jar", tool, "build-apks", f"--bundle={bundle}",
            f"--output={archive_path}", "--mode=universal",
            f"--ks={os.environ['CM_KEYSTORE_PATH']}", f"--ks-key-alias={os.environ['CM_KEY_ALIAS']}",
            f"--ks-pass=file:{store_password}", f"--key-pass=file:{key_password}")
        with zipfile.ZipFile(archive_path) as apks:
            apks.extract("universal.apk", folder)
        run(zipalign, "-c", "-P", "16", "4", Path(folder) / "universal.apk")
    mapping = ROOT / "android/app/build/outputs/mapping/release/mapping.txt"
    assert mapping.is_file() and mapping.stat().st_size > 0, "Missing R8 mapping"
    mapping_text = mapping.read_text()
    assert re.search(r"^\S+ -> [a-z][\w.]*:$", mapping_text, re.M), "No R8 class mappings found"
    libraries = []
    with zipfile.ZipFile(bundle) as archive:
        assert archive.testzip() is None, "Corrupt bundle entry"
        assert "base/assets/capacitor.plugins.json" in archive.namelist(), "Missing Capacitor registry"
        plugins = json.loads(archive.read("base/assets/capacitor.plugins.json"))
        assert len(plugins) >= 10, "Missing Capacitor plugins"
        for name in archive.namelist():
            if not name.endswith(".so"):
                continue
            data = archive.read(name)
            assert data[:4] == b"\x7fELF", f"Invalid native library: {name}"
            # 16 KB Android devices use 64-bit ARM or x86. Validate each LOAD segment.
            if data[4] != 2:
                continue
            endian = "<" if data[5] == 1 else ">"
            offset = struct.unpack_from(endian + "Q", data, 32)[0]
            size, count = struct.unpack_from(endian + "HH", data, 54)
            loads = []
            for index in range(count):
                entry = offset + index * size
                if struct.unpack_from(endian + "I", data, entry)[0] == 1:
                    alignment = struct.unpack_from(endian + "Q", data, entry + 48)[0]
                    assert alignment >= 16384, f"Native LOAD alignment below 16 KB: {name}"
                    loads.append(alignment)
            assert loads, f"No ELF LOAD segments: {name}"
            libraries.append({"path": name, "load_alignments": loads})
    report = {
        "package": expected["package"], "version": "2.0", "versionCode": expected_code,
        "minSdk": 24, "targetSdk": 36, "bundle_sha256": hashlib.sha256(bundle.read_bytes()).hexdigest(),
        "upload_certificate_sha256": hashlib.sha256(signed_cert).hexdigest(),
        "r8_mapping": str(mapping.relative_to(ROOT)), "native_libraries": libraries,
        "apk_zip_alignment": "16 KB checked with zipalign", "checks": "passed",
        "remaining": "Play upload, protected-device startup, real billing and legacy-subscriber tests",
    }
    report_path = bundle.parent / "release-verification.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
