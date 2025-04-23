export function formatCamelCase(text: string) {
    return text
        .replace(/([A-Z])/g, ' $1')       // insert space before capital letters
        .replace(/^./, str => str.toUpperCase()); // capitalize first letter
}