export class ColorUtils {
    public static calculateBorderColor(fillColor: string): string {
        let hex: string = fillColor.replace('#', '');
        
        // Handle shorthand hex #123.
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        let r: number = 0;
        let g: number = 0;
        let b: number = 0;

        if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            return '#000000';  // Fallback for invalid hex.
        }

        // Darken by 40% (multiply by 0.6).
        const factor: number = 0.6;
        
        r = Math.max(0, Math.floor(r * factor));
        g = Math.max(0, Math.floor(g * factor));
        b = Math.max(0, Math.floor(b * factor));

        const toHex: (n: number) => string = (n: number): string => {
            const h: string = n.toString(16);
            return h.length === 1 ? '0' + h : h;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}
