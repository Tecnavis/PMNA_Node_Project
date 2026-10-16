/**
 * WhatsApp Cloud API (Meta) sender. Does nothing until these are set on the server:
 *   WA_TOKEN             permanent access token (System User)
 *   WA_PHONE_NUMBER_ID   the "Phone number ID" from WhatsApp Manager → API setup
 * Optional: WA_API_VERSION (default v21.0)
 */
const axios = require('axios');

const enabled = () => !!(process.env.WA_TOKEN && process.env.WA_PHONE_NUMBER_ID);
const url = () => `https://graph.facebook.com/${process.env.WA_API_VERSION || 'v21.0'}/${process.env.WA_PHONE_NUMBER_ID}/messages`;

async function send(to, payload) {
    if (!enabled()) return { skipped: true };
    try {
        const r = await axios.post(url(), { messaging_product: 'whatsapp', recipient_type: 'individual', to, ...payload }, {
            headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, 'Content-Type': 'application/json' },
            timeout: 15000,
        });
        return { ok: true, id: r.data?.messages?.[0]?.id };
    } catch (e) {
        console.error('[whatsapp] send failed', e.response?.status, JSON.stringify(e.response?.data?.error || e.message).slice(0, 300));
        return { ok: false };
    }
}

const clip = (s, n) => String(s || '').slice(0, n);

module.exports = {
    enabled,
    text: (to, body) => send(to, { type: 'text', text: { preview_url: false, body: clip(body, 4000) } }),
    /** up to 3 quick-reply buttons: [{ id, title }] */
    buttons: (to, body, buttons) => send(to, {
        type: 'interactive',
        interactive: { type: 'button', body: { text: clip(body, 1000) }, action: { buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: clip(b.id, 256), title: clip(b.title, 20) } })) } },
    }),
    /** a pick-list: rows [{ id, title, description? }] (max 10) */
    list: (to, body, buttonText, rows) => send(to, {
        type: 'interactive',
        interactive: {
            type: 'list', body: { text: clip(body, 1000) },
            action: { button: clip(buttonText, 20), sections: [{ title: 'Choose one', rows: rows.slice(0, 10).map((r) => ({ id: clip(r.id, 200), title: clip(r.title, 24), ...(r.description ? { description: clip(r.description, 72) } : {}) })) }] },
        },
    }),
    /** ask the customer to share their location */
    askLocation: (to, body) => send(to, { type: 'interactive', interactive: { type: 'location_request_message', body: { text: clip(body, 1024) }, action: { name: 'send_location' } } }),
    markRead: (messageId) => send(undefined, { status: 'read', message_id: messageId }),
};
