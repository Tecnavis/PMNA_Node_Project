// One search rule for every booking search box.
// - Spaces, dashes, dots and slashes are ignored: "KL10AB1234" finds "KL 10 AB 1234",
//   "TI02893432" finds " TI02893432", "PMNA/26-27/218" finds "PMNA 26-27 218".
// - The text is matched literally (characters like ( + * # are safe).
// - Searches file number (case id), vehicle numbers, mobiles, invoice number and customer name.
const mongoose = require('mongoose');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text with no separators, e.g. "KL 10-AB" -> "KL10AB"
const compact = (q) => String(q || '').trim().replace(/[\s\-./]+/g, '');

// Regex that allows any separators between the characters
function looseRegex(q) {
    const c = compact(q);
    if (!c) return new RegExp(escapeRegex(String(q || '').trim()), 'i');
    return new RegExp(c.split('').map(escapeRegex).join('[\\s\\-./]*'), 'i');
}

// Plain literal match (for names)
const plainRegex = (q) => new RegExp(escapeRegex(String(q || '').trim()), 'i');

// Looks like a case id / file number / vehicle / phone / invoice (has at least 3 digits).
// Such searches should find the booking on any date, not only inside the selected month.
const isIdentifierSearch = (q) => (compact(q).match(/\d/g) || []).length >= 3;

// Conditions on the booking's own fields
function bookingFieldConditions(q) {
    const loose = looseRegex(q);
    const plain = plainRegex(q);
    const conds = [
        { fileNumber: loose },
        { customerVehicleNumber: loose },
        { serviceVehicleNumber: loose },
        { vehicleNumber: loose },
        { mob1: loose },
        { mob2: loose },
        { invoiceNumber: loose },
        { customerName: plain },
    ];
    const t = String(q || '').trim();
    if (/^[a-f0-9]{24}$/i.test(t)) conds.push({ _id: new mongoose.Types.ObjectId(t) });
    return conds;
}

module.exports = { escapeRegex, compact, looseRegex, plainRegex, isIdentifierSearch, bookingFieldConditions };
