/** Keeps device state recoverable unless the server confirms the entire account deletion. */
export async function deleteAccountWithConfirmation(deps: {
  remove:()=>Promise<{ok?:boolean}>; clear:()=>void|Promise<void>;
}) {
  const result=await deps.remove();
  if(result?.ok!==true)throw new Error('Deletion was not confirmed. Your device data has been kept. Please retry.');
  await deps.clear();
  return true;
}
