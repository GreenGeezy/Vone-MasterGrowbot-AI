/**
 * Diagnosis Formatter Utility
 * Handles adaptive text display based on User Experience Level.
 */

export const formatMetricDisplay = (
    value: any,
    type: 'health' | 'harvest' | 'nutrient' | 'vpd',
    level: string = 'Novice',
    growMethod: 'Indoor' | 'Outdoor' | 'Greenhouse' = 'Indoor'
): string => {
    const isExpert = level === 'Expert';
    const isIntermediate = level === 'Intermediate';

    if (!value || value === 'N/A') return "--";

    switch (type) {
        case 'health':
            const score = typeof value === 'number' ? value : parseInt(value, 10);
            if (isNaN(score)) return value;
            if (isExpert) return `${score}/100`;
            if (isIntermediate) return `${score} - ${getHealthWord(score)}`;
            return getHealthWord(score);

        case 'harvest':
            if (isExpert) return value;
            return value.replace('Weeks', 'Wks');

        case 'nutrient':
            // OUTDOOR: Interpreted as WATERING URGENCY (1-10)
            if (growMethod === 'Outdoor') {
                const urgency = parseFloat(value);
                if (isNaN(urgency)) return "Check Soil";
                if (urgency >= 8) return "⚠️ Dry / Water Now";
                if (urgency >= 5) return "Monitor Soil";
                return "Hydration Good";
            }

            // INDOOR/GREENHOUSE: Interpreted as EC
            const ec = parseFloat(value);
            if (isNaN(ec)) return value;
            if (isExpert) return `${ec.toFixed(1)} EC`;
            if (ec < 1.0) return "Light Feed";
            if (ec > 2.2) return "Heavy Feed";
            return "Standard Feed";

        case 'vpd':
            // OUTDOOR: Interpreted as ENV RISK SCORE (1-10)
            if (growMethod === 'Outdoor') {
                const risk = parseFloat(value);
                if (isNaN(risk)) return "Check Weather";
                if (risk >= 8) return "⚠️ High Weather Risk";
                if (risk >= 5) return "Moderate Risk";
                return "Weather Safe";
            }

            // GREENHOUSE: Interpreted as VPD but careful of Mold
            if (growMethod === 'Greenhouse') {
                // If the value is text (e.g. from prompt saying "Dry it out"), return text
                if (isNaN(parseFloat(value))) return value;
                // Otherwise normal logic with mold emphasis
                const vpdGH = parseFloat(value);
                if (isExpert) return `${vpdGH.toFixed(1)} kPa`;
                if (vpdGH < 0.5) return "⚠️ Mold Risk (Humid)";
                if (vpdGH > 1.8) return "⚠️ Heat Risk (Dry)";
                return "Good Airflow"; // Greenhouse specific positive term
            }

            // INDOOR: Standard VPD
            const vpd = parseFloat(value);
            if (isNaN(vpd)) return value;
            if (isExpert) return `${vpd.toFixed(1)} kPa`;
            if (vpd < 0.4) return "Too Humid";
            if (vpd > 1.6) return "Too Dry";
            return "Good Humidity";

        default:
            return value;
    }
};

const getHealthWord = (score: number): string => {
    if (score >= 90) return "Thriving";
    if (score >= 75) return "Great";
    if (score >= 60) return "Good";
    if (score >= 45) return "Average";
    if (score >= 30) return "Suboptimal";
    if (score >= 15) return "Poor";
    return "Struggling";
};

export const formatDiagnosisReport = (result: any): string => {
    if (!result) return "";

    const lines = [];

    // Header
    lines.push(`🌿 **MasterGrowbot Diagnosis**`);
    lines.push(`📅 Date: ${new Date().toLocaleDateString()}`);
    lines.push("");

    // Core Diagnosis
    lines.push(`🩺 **Diagnosis**: ${result.diagnosis}`);
    lines.push(`📊 **Severity**: ${result.severity?.toUpperCase() || 'UNKNOWN'}`);
    lines.push(`❤️ **Health Score**: ${result.healthScore || 0}/100 (${result.healthLabel || 'Analyzed'})`);
    lines.push("");

    // Priority Action
    if (result.topAction) {
        lines.push(`⚡ **Top Priority Action**`);
        lines.push(`${result.topAction}`);
        lines.push("");
    }

    // Fix Steps
    if (result.fixSteps && result.fixSteps.length > 0) {
        lines.push(`✅ **Recovery Steps**`);
        result.fixSteps.forEach((step: string) => lines.push(`• ${step}`));
        lines.push("");
    }

    // Prevention
    if (result.preventionTips && result.preventionTips.length > 0) {
        lines.push(`🛡️ **Prevention Tips**`);
        result.preventionTips.forEach((tip: string) => lines.push(`• ${tip}`));
        lines.push("");
    }

    // Targets
    if (result.nutrientTargets || result.environmentTargets) {
        lines.push(`🎯 **Optimal Targets**`);
        if (result.nutrientTargets?.ec) lines.push(`• EC: ${result.nutrientTargets.ec}`);
        if (result.nutrientTargets?.ph) lines.push(`• pH: ${result.nutrientTargets.ph}`);
        if (result.environmentTargets?.vpd) lines.push(`• VPD: ${result.environmentTargets.vpd}`);
        if (result.environmentTargets?.temp) lines.push(`• Temp: ${result.environmentTargets.temp}`);
        if (result.environmentTargets?.rh) lines.push(`• RH: ${result.environmentTargets.rh}`);
        lines.push("");
    }

    lines.push(`🚀 *Diagnosed by MasterGrowbot AI*`);

    return lines.join("\n");
};
