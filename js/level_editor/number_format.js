// js/level_editor/number_format.js
//
// Live thousands-separator (space) formatting for plain numeric fields in the
// level editor (health, price, damage, cooldowns, ...), so "1000" reads as
// "1 000" while you type. Matches the space-separated style already used for
// the in-game score overlay (see Game.js's fr-FR based `fmt` helper).
// Decimals are supported too: only the integer part is grouped, the "."
// and everything after it is left untouched, e.g. "5000.5" -> "5 000.5".
//
// Fields that want this behaviour are marked with the `input-thousands` CSS
// class and rendered with type="text" (native <input type="number"> cannot
// display anything but plain digits). `attachThousandsFormatting` wires up a
// single delegated listener that reformats any such field on every keystroke.

const SEPARATOR = ' ';

/** Counts plain digit characters (0-9) in a string. */
function countDigits(str) {
    let count = 0;
    for (const ch of str) {
        if (ch >= '0' && ch <= '9') count++;
    }
    return count;
}

/**
 * Strips everything except digits, a single leading minus sign, and a single
 * decimal point (later ones are dropped, so you can't type two).
 * @param {string} value
 * @returns {string} e.g. "-1 200.50x" -> "-1200.50".
 */
export function unformatNumber(value) {
    if (value == null) return '';
    const str = String(value);
    const negative = str.trim().startsWith('-');
    let result = '';
    let seenDot = false;
    for (const ch of str) {
        if (ch >= '0' && ch <= '9') {
            result += ch;
        } else if (ch === '.' && !seenDot) {
            result += '.';
            seenDot = true;
        }
    }
    return (negative && result ? '-' : '') + result;
}

/**
 * Formats a raw digit string (or number) with a space every 3 digits in the
 * integer part. The decimal part (if any) is left as typed.
 * @param {string|number} value
 * @returns {string} e.g. 1200 -> "1 200"; "5000.5" -> "5 000.5".
 */
export function formatNumber(value) {
    const raw = unformatNumber(value);
    const negative = raw.startsWith('-');
    const body = negative ? raw.slice(1) : raw;
    const dotIndex = body.indexOf('.');
    const intPart = dotIndex === -1 ? body : body.slice(0, dotIndex);
    const decPart = dotIndex === -1 ? undefined : body.slice(dotIndex + 1);

    if (!intPart && decPart === undefined) return negative ? '-' : '';

    const groupedInt = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATOR);
    const result = (negative ? '-' : '') + groupedInt + (decPart !== undefined ? '.' + decPart : '');
    return result;
}

/**
 * Parses a (possibly space-formatted) field value back into a plain number.
 * @param {string} value
 * @returns {number} 0 if there are no digits to parse.
 */
export function parseThousands(value) {
    const raw = unformatNumber(value);
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Attaches a single delegated 'input' listener to `root` that live-formats
 * every `.input-thousands` field inside it with spaces as a thousands
 * separator, keeping the caret in place relative to the digits around it
 * (works on both sides of a decimal point). Safe to call multiple times with
 * different roots (each adds its own listener); callers should still only
 * call it once per root.
 * @param {Document|HTMLElement} root
 */
export function attachThousandsFormatting(root) {
    if (!root) return;

    root.addEventListener('input', (e) => {
        const input = e.target;
        if (!input.matches || !input.matches('.input-thousands')) return;

        const previousValue = input.value;
        const previousCaret = input.selectionStart ?? previousValue.length;
        const prevDotIndex = previousValue.indexOf('.');

        // Figure out where the caret sits relative to the decimal point, in
        // terms of digit counts (the part that survives reformatting).
        const inDecimal = prevDotIndex !== -1 && previousCaret > prevDotIndex;
        const intDigitsBeforeCaret = inDecimal
            ? countDigits(previousValue.slice(0, prevDotIndex))
            : countDigits(previousValue.slice(0, previousCaret));
        const decDigitsBeforeCaret = inDecimal
            ? countDigits(previousValue.slice(prevDotIndex + 1, previousCaret))
            : 0;

        const formatted = formatNumber(previousValue);
        if (formatted === previousValue) return; // nothing to adjust
        input.value = formatted;

        const newDotIndex = formatted.indexOf('.');
        let caret;

        if (inDecimal) {
            // Decimal digits map 1:1 (no grouping there), so just offset from the dot.
            caret = (newDotIndex === -1 ? formatted.length : newDotIndex + 1) + decDigitsBeforeCaret;
        } else if (intDigitsBeforeCaret === 0) {
            caret = formatted.startsWith('-') ? 1 : 0;
        } else {
            const intEnd = newDotIndex === -1 ? formatted.length : newDotIndex;
            let seenDigits = 0;
            caret = intEnd;
            for (let i = 0; i < intEnd; i++) {
                if (/\d/.test(formatted[i])) {
                    seenDigits++;
                    if (seenDigits >= intDigitsBeforeCaret) {
                        caret = i + 1;
                        break;
                    }
                }
            }
        }
        input.setSelectionRange(caret, caret);
    });
}
