// js/level_editor/JsonStepper.js
//
// Generic +/- stepper UI for numeric text inputs. Mark any input with a
// `data-json-stepper="<config-key>"` attribute and it grows a small "−"/"+"
// button pair, grouped together at its right edge, inside its own border.
//
// Usage:
//   <input type="text" class="input-thousands" id="startingLifesInput" value="1"
//          data-json-stepper="starting_lifes">
//   initJsonSteppers(document); // once on load, and again after re-rendering
//                                  any dynamically-built rows
//
// The attribute's value IS the lookup key into JsonStepperConfig.json - no
// guessing it from the input's id/class, it's just stated explicitly on the
// element. Nothing about step size, min or max is written in markup or JS:
// that config entry is the single source of truth for the field's numbers -
// the same `step` value both drives the +/- math AND is what the hover
// tooltip shows, so there's only ever one place to change it.
//
// A button press only ever edits `input.value` and re-fires the input's own
// 'input' + 'change' events, exactly as if the value had been typed by hand.
// It never touches the JSON itself — whatever's already wired to the field
// (thousands formatting, the onchange handler that writes into the level
// JSON, ...) keeps working unmodified.

const WRAPPED_ATTR = 'data-json-stepper-ready';
const CONFIG_URL = new URL('./JsonStepperConfig.json', import.meta.url);
const REPEAT_DELAY = 450;   // ms held before auto-repeat kicks in
const REPEAT_INTERVAL = 90; // ms between steps while held

let configPromise = null;

/** Fetches JsonStepperConfig.json once and caches the promise. */
function loadConfig() {
    if (!configPromise) {
        configPromise = fetch(CONFIG_URL)
            .then((res) => res.json())
            .catch((err) => {
                console.error('JsonStepper: failed to load JsonStepperConfig.json', err);
                return {};
            });
    }
    return configPromise;
}

/** Reads the input's current value as a plain number, ignoring thousands
 *  separators or any other non-numeric formatting. */
function readValue(input) {
    const raw = String(input.value ?? '').replace(/[^0-9.-]/g, '');
    const num = parseFloat(raw);
    return Number.isNaN(num) ? 0 : num;
}

function applyStep(input, direction, settings) {
    // Some panels (e.g. the tower cards) rebuild their whole innerHTML on
    // every 'change' - including the one this function is about to dispatch
    // - which detaches this exact input from the document. A still-running
    // hold-repeat interval must not keep stepping (and dispatching more
    // 'change' events, re-triggering that same rebuild) against that now-dead
    // node forever, so bail out as soon as it's no longer connected.
    if (!input.isConnected) return false;

    const { step, min, max } = settings;
    const next = Math.min(max, Math.max(min, readValue(input) + direction * step));
    input.value = String(next);

    // Re-dispatch as if the user had typed the new value: lets any existing
    // 'input' (live formatting) and 'change' (save-to-JSON) listeners fire.
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
    return true;
}

/** Wires press-and-hold auto-repeat onto a stepper button. Pointer Events
 *  cover mouse, touch and pen in one listener set. A trailing 'click'
 *  listener only handles keyboard activation (Enter/Space), since that fires
 *  a 'click' with no preceding 'pointerdown'. */
function bindHold(btn, input, direction, settings) {
    let timer = null;
    let startedByPointer = false;

    const clearTimer = () => {
        clearTimeout(timer);
        clearInterval(timer);
        timer = null;
    };

    const start = () => {
        applyStep(input, direction, settings);
        timer = setTimeout(() => {
            timer = setInterval(() => {
                if (!applyStep(input, direction, settings)) clearTimer();
            }, REPEAT_INTERVAL);
        }, REPEAT_DELAY);
    };

    const isOverButton = (e) => {
        const rect = btn.getBoundingClientRect();
        return e.clientX >= rect.left && e.clientX <= rect.right
            && e.clientY >= rect.top && e.clientY <= rect.bottom;
    };

    btn.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return; // left click / primary touch only
        startedByPointer = true;
        // Captured so a drag-off-then-release still reliably reaches this
        // button's 'pointerup' (instead of getting lost over some other
        // element) - but capture also means 'pointerleave' stops firing for
        // boundary crossing, so leaving the button is instead detected by
        // hand below, off the still-delivered 'pointermove'.
        btn.setPointerCapture?.(e.pointerId);
        start();
    });
    btn.addEventListener('pointermove', (e) => {
        if (timer !== null && !isOverButton(e)) clearTimer();
    });
    ['pointerup', 'pointercancel'].forEach((evt) => {
        btn.addEventListener(evt, clearTimer);
    });
    btn.addEventListener('click', () => {
        if (startedByPointer) {
            // Already stepped (at least once) on pointerdown above.
            startedByPointer = false;
            return;
        }
        applyStep(input, direction, settings);
    });
}

function makeButton(symbol, direction, input, settings) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `json-stepper-btn ${direction > 0 ? 'json-stepper-plus' : 'json-stepper-minus'}`;
    btn.textContent = symbol;

    // Hover tooltip uses the same UI as the ℹ️ info-icons (TooltipController),
    // just fed a runtime-computed value instead of a JSON-description lookup -
    // the delta text is derived straight from `settings.step`, never re-typed.
    btn.dataset.tooltipText = `${direction > 0 ? '+' : '-'}${settings.step}`;
    btn.setAttribute('aria-label', direction > 0 ? `Increase by ${settings.step}` : `Decrease by ${settings.step}`);
    btn.tabIndex = -1; // keep tab order landing on the input, not the buttons

    bindHold(btn, input, direction, settings);
    return btn;
}

/**
 * Wraps every not-yet-wrapped `[data-json-stepper]` input under `root` with a
 * −/+ button pair grouped at its right edge, configured from
 * JsonStepperConfig.json. Safe to call repeatedly (e.g. after re-rendering a
 * repeater row) — inputs that are already wrapped are skipped.
 * @param {Document|HTMLElement} [root]
 */
export async function initJsonSteppers(root = document) {
    const config = await loadConfig();

    root.querySelectorAll('[data-json-stepper]').forEach((input) => {
        if (input.hasAttribute(WRAPPED_ATTR)) return;
        input.setAttribute(WRAPPED_ATTR, '');

        const key = input.dataset.jsonStepper;
        const entry = config[key];
        if (!entry) {
            console.warn(`JsonStepper: no "${key}" entry in JsonStepperConfig.json for #${input.id || '(no id)'}`);
        }
        const settings = {
            step: entry?.step ?? 1,
            min: entry?.min ?? -Infinity,
            max: entry?.max ?? Infinity,
        };

        const wrap = document.createElement('div');
        wrap.className = 'json-stepper-wrap';
        input.parentNode.insertBefore(wrap, input);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'json-stepper-btn-group';
        btnGroup.appendChild(makeButton('−', -1, input, settings));
        btnGroup.appendChild(makeButton('+', 1, input, settings));

        wrap.appendChild(input);
        wrap.appendChild(btnGroup);
    });
}
