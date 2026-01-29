/**
 * Diagnosis Formatter Utility
 * Handles adaptive text display based on User Experience Level.
 */

export const formatMetricDisplay = (
    value: any,
    type: 'health' | 'harvest' | 'nutrient' | 'vpd',
    level: string = 'Novice'
): string => {
    const isExpert = level === 'Expert';
    const isIntermediate = level === 'Intermediate';

    if (!value || value === 'N/A') return "--";

    switch (type) {
        case 'health':
            // Value is expected to be a number 0-100 or a string if already formatted
            const score = typeof value === 'number' ? value : parseInt(value, 10);
            if (isNaN(score)) return value; // Fallback

            if (isExpert) return `${score}/100`; // "85/100"
            if (isIntermediate) return `${score} - ${getHealthWord(score)}`; // "85 - Good"
            return getHealthWord(score); // "Good" (Novice)

        case 'harvest':
            // Value is usually "X Weeks"
            if (isExpert) return value; // "3-4 Weeks"
            return value.replace('Weeks', 'Wks'); // "3-4 Wks" (Simpler)

        case 'nutrient':
            // Value expected: EC number (e.g. 1.8)
            // Experts see exact numbers, Novices see "Low/Med/High Feed"
            const ec = parseFloat(value);
            if (isNaN(ec)) return value;

            if (isExpert) return `${ec.toFixed(1)} EC`;

            // Simple logic for Novice/Intermediate
            if (ec < 1.0) return "Light Feed";
            if (ec > 2.2) return "Heavy Feed";
            return "Standard Feed";

        case 'vpd':
            // Value expected: kPa (e.g. 1.2)
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
