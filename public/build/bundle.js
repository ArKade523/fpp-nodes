
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src/Tab.svelte generated by Svelte v3.59.2 */

    const file$2 = "src/Tab.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t0;
    	let t1_value = /*tab*/ ctx[0].id + "";
    	let t1;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text("Tab ");
    			t1 = text(t1_value);

    			attr_dev(button, "class", button_class_value = "tab-list-item " + (/*$activeTab*/ ctx[2] === /*tab*/ ctx[0].id
    			? 'active'
    			: ''));

    			add_location(button, file$2, 16, 2, 287);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*selectTab*/ ctx[3], false, false, false, false),
    					listen_dev(button, "keydown", /*handleKeyDown*/ ctx[4], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*tab*/ 1 && t1_value !== (t1_value = /*tab*/ ctx[0].id + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$activeTab, tab*/ 5 && button_class_value !== (button_class_value = "tab-list-item " + (/*$activeTab*/ ctx[2] === /*tab*/ ctx[0].id
    			? 'active'
    			: ''))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $activeTab,
    		$$unsubscribe_activeTab = noop,
    		$$subscribe_activeTab = () => ($$unsubscribe_activeTab(), $$unsubscribe_activeTab = subscribe(activeTab, $$value => $$invalidate(2, $activeTab = $$value)), activeTab);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_activeTab());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tab', slots, []);
    	let { tab } = $$props;
    	let { activeTab } = $$props;
    	validate_store(activeTab, 'activeTab');
    	$$subscribe_activeTab();

    	const selectTab = () => {
    		activeTab.set(tab.id);
    	};

    	const handleKeyDown = event => {
    		// Only respond to Enter key
    		if (event.key === 'Enter') {
    			selectTab();
    		}
    	};

    	$$self.$$.on_mount.push(function () {
    		if (tab === undefined && !('tab' in $$props || $$self.$$.bound[$$self.$$.props['tab']])) {
    			console.warn("<Tab> was created without expected prop 'tab'");
    		}

    		if (activeTab === undefined && !('activeTab' in $$props || $$self.$$.bound[$$self.$$.props['activeTab']])) {
    			console.warn("<Tab> was created without expected prop 'activeTab'");
    		}
    	});

    	const writable_props = ['tab', 'activeTab'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tab> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    		if ('activeTab' in $$props) $$subscribe_activeTab($$invalidate(1, activeTab = $$props.activeTab));
    	};

    	$$self.$capture_state = () => ({
    		tab,
    		activeTab,
    		selectTab,
    		handleKeyDown,
    		$activeTab
    	});

    	$$self.$inject_state = $$props => {
    		if ('tab' in $$props) $$invalidate(0, tab = $$props.tab);
    		if ('activeTab' in $$props) $$subscribe_activeTab($$invalidate(1, activeTab = $$props.activeTab));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tab, activeTab, $activeTab, selectTab, handleKeyDown];
    }

    class Tab extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { tab: 0, activeTab: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tab",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get tab() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tab(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get activeTab() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeTab(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /*!
    * rete v1.5.2 
    * (c) 2023 Vitaliy Stoliarov 
    * Released under the MIT license.
    */
    function ownKeys(object, enumerableOnly) {
      var keys = Object.keys(object);

      if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        enumerableOnly && (symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        })), keys.push.apply(keys, symbols);
      }

      return keys;
    }

    function _objectSpread2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = null != arguments[i] ? arguments[i] : {};
        i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
          _defineProperty$1(target, key, source[key]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }

      return target;
    }

    function _regeneratorRuntime() {
      /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */

      _regeneratorRuntime = function () {
        return exports;
      };

      var exports = {},
          Op = Object.prototype,
          hasOwn = Op.hasOwnProperty,
          $Symbol = "function" == typeof Symbol ? Symbol : {},
          iteratorSymbol = $Symbol.iterator || "@@iterator",
          asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
          toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

      function define(obj, key, value) {
        return Object.defineProperty(obj, key, {
          value: value,
          enumerable: !0,
          configurable: !0,
          writable: !0
        }), obj[key];
      }

      try {
        define({}, "");
      } catch (err) {
        define = function (obj, key, value) {
          return obj[key] = value;
        };
      }

      function wrap(innerFn, outerFn, self, tryLocsList) {
        var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
            generator = Object.create(protoGenerator.prototype),
            context = new Context(tryLocsList || []);
        return generator._invoke = function (innerFn, self, context) {
          var state = "suspendedStart";
          return function (method, arg) {
            if ("executing" === state) throw new Error("Generator is already running");

            if ("completed" === state) {
              if ("throw" === method) throw arg;
              return doneResult();
            }

            for (context.method = method, context.arg = arg;;) {
              var delegate = context.delegate;

              if (delegate) {
                var delegateResult = maybeInvokeDelegate(delegate, context);

                if (delegateResult) {
                  if (delegateResult === ContinueSentinel) continue;
                  return delegateResult;
                }
              }

              if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
                if ("suspendedStart" === state) throw state = "completed", context.arg;
                context.dispatchException(context.arg);
              } else "return" === context.method && context.abrupt("return", context.arg);
              state = "executing";
              var record = tryCatch(innerFn, self, context);

              if ("normal" === record.type) {
                if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
                return {
                  value: record.arg,
                  done: context.done
                };
              }

              "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
            }
          };
        }(innerFn, self, context), generator;
      }

      function tryCatch(fn, obj, arg) {
        try {
          return {
            type: "normal",
            arg: fn.call(obj, arg)
          };
        } catch (err) {
          return {
            type: "throw",
            arg: err
          };
        }
      }

      exports.wrap = wrap;
      var ContinueSentinel = {};

      function Generator() {}

      function GeneratorFunction() {}

      function GeneratorFunctionPrototype() {}

      var IteratorPrototype = {};
      define(IteratorPrototype, iteratorSymbol, function () {
        return this;
      });
      var getProto = Object.getPrototypeOf,
          NativeIteratorPrototype = getProto && getProto(getProto(values([])));
      NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
      var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);

      function defineIteratorMethods(prototype) {
        ["next", "throw", "return"].forEach(function (method) {
          define(prototype, method, function (arg) {
            return this._invoke(method, arg);
          });
        });
      }

      function AsyncIterator(generator, PromiseImpl) {
        function invoke(method, arg, resolve, reject) {
          var record = tryCatch(generator[method], generator, arg);

          if ("throw" !== record.type) {
            var result = record.arg,
                value = result.value;
            return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
              invoke("next", value, resolve, reject);
            }, function (err) {
              invoke("throw", err, resolve, reject);
            }) : PromiseImpl.resolve(value).then(function (unwrapped) {
              result.value = unwrapped, resolve(result);
            }, function (error) {
              return invoke("throw", error, resolve, reject);
            });
          }

          reject(record.arg);
        }

        var previousPromise;

        this._invoke = function (method, arg) {
          function callInvokeWithMethodAndArg() {
            return new PromiseImpl(function (resolve, reject) {
              invoke(method, arg, resolve, reject);
            });
          }

          return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
        };
      }

      function maybeInvokeDelegate(delegate, context) {
        var method = delegate.iterator[context.method];

        if (undefined === method) {
          if (context.delegate = null, "throw" === context.method) {
            if (delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel;
            context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method");
          }

          return ContinueSentinel;
        }

        var record = tryCatch(method, delegate.iterator, context.arg);
        if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
        var info = record.arg;
        return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
      }

      function pushTryEntry(locs) {
        var entry = {
          tryLoc: locs[0]
        };
        1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
      }

      function resetTryEntry(entry) {
        var record = entry.completion || {};
        record.type = "normal", delete record.arg, entry.completion = record;
      }

      function Context(tryLocsList) {
        this.tryEntries = [{
          tryLoc: "root"
        }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
      }

      function values(iterable) {
        if (iterable) {
          var iteratorMethod = iterable[iteratorSymbol];
          if (iteratorMethod) return iteratorMethod.call(iterable);
          if ("function" == typeof iterable.next) return iterable;

          if (!isNaN(iterable.length)) {
            var i = -1,
                next = function next() {
              for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;

              return next.value = undefined, next.done = !0, next;
            };

            return next.next = next;
          }
        }

        return {
          next: doneResult
        };
      }

      function doneResult() {
        return {
          value: undefined,
          done: !0
        };
      }

      return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
        var ctor = "function" == typeof genFun && genFun.constructor;
        return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
      }, exports.mark = function (genFun) {
        return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
      }, exports.awrap = function (arg) {
        return {
          __await: arg
        };
      }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
        return this;
      }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
        void 0 === PromiseImpl && (PromiseImpl = Promise);
        var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
        return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
          return result.done ? result.value : iter.next();
        });
      }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
        return this;
      }), define(Gp, "toString", function () {
        return "[object Generator]";
      }), exports.keys = function (object) {
        var keys = [];

        for (var key in object) keys.push(key);

        return keys.reverse(), function next() {
          for (; keys.length;) {
            var key = keys.pop();
            if (key in object) return next.value = key, next.done = !1, next;
          }

          return next.done = !0, next;
        };
      }, exports.values = values, Context.prototype = {
        constructor: Context,
        reset: function (skipTempReset) {
          if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
        },
        stop: function () {
          this.done = !0;
          var rootRecord = this.tryEntries[0].completion;
          if ("throw" === rootRecord.type) throw rootRecord.arg;
          return this.rval;
        },
        dispatchException: function (exception) {
          if (this.done) throw exception;
          var context = this;

          function handle(loc, caught) {
            return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
          }

          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i],
                record = entry.completion;
            if ("root" === entry.tryLoc) return handle("end");

            if (entry.tryLoc <= this.prev) {
              var hasCatch = hasOwn.call(entry, "catchLoc"),
                  hasFinally = hasOwn.call(entry, "finallyLoc");

              if (hasCatch && hasFinally) {
                if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
                if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
              } else if (hasCatch) {
                if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
              } else {
                if (!hasFinally) throw new Error("try statement without catch or finally");
                if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
              }
            }
          }
        },
        abrupt: function (type, arg) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];

            if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
              var finallyEntry = entry;
              break;
            }
          }

          finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
          var record = finallyEntry ? finallyEntry.completion : {};
          return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
        },
        complete: function (record, afterLoc) {
          if ("throw" === record.type) throw record.arg;
          return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
        },
        finish: function (finallyLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
          }
        },
        catch: function (tryLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];

            if (entry.tryLoc === tryLoc) {
              var record = entry.completion;

              if ("throw" === record.type) {
                var thrown = record.arg;
                resetTryEntry(entry);
              }

              return thrown;
            }
          }

          throw new Error("illegal catch attempt");
        },
        delegateYield: function (iterable, resultName, nextLoc) {
          return this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc
          }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
        }
      }, exports;
    }

    function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error) {
        reject(error);
        return;
      }

      if (info.done) {
        resolve(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }

    function _asyncToGenerator(fn) {
      return function () {
        var self = this,
            args = arguments;
        return new Promise(function (resolve, reject) {
          var gen = fn.apply(self, args);

          function _next(value) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
          }

          function _throw(err) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
          }

          _next(undefined);
        });
      };
    }

    function _classCallCheck$2(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _defineProperties$2(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass$2(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties$2(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties$2(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", {
        writable: false
      });
      return Constructor;
    }

    function _defineProperty$1(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }

      subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
          value: subClass,
          writable: true,
          configurable: true
        }
      });
      Object.defineProperty(subClass, "prototype", {
        writable: false
      });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }

    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
      };
      return _getPrototypeOf(o);
    }

    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
      };
      return _setPrototypeOf(o, p);
    }

    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;

      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
        return true;
      } catch (e) {
        return false;
      }
    }

    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }

      return self;
    }

    function _possibleConstructorReturn(self, call) {
      if (call && (typeof call === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }

      return _assertThisInitialized(self);
    }

    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();

      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived),
            result;

        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;

          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }

        return _possibleConstructorReturn(this, result);
      };
    }

    function _superPropBase(object, property) {
      while (!Object.prototype.hasOwnProperty.call(object, property)) {
        object = _getPrototypeOf(object);
        if (object === null) break;
      }

      return object;
    }

    function _get() {
      if (typeof Reflect !== "undefined" && Reflect.get) {
        _get = Reflect.get.bind();
      } else {
        _get = function _get(target, property, receiver) {
          var base = _superPropBase(target, property);

          if (!base) return;
          var desc = Object.getOwnPropertyDescriptor(base, property);

          if (desc.get) {
            return desc.get.call(arguments.length < 3 ? target : receiver);
          }

          return desc.value;
        };
      }

      return _get.apply(this, arguments);
    }

    function _slicedToArray$2(arr, i) {
      return _arrayWithHoles$2(arr) || _iterableToArrayLimit$2(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest$2();
    }

    function _toConsumableArray$1(arr) {
      return _arrayWithoutHoles$1(arr) || _iterableToArray$1(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread$1();
    }

    function _arrayWithoutHoles$1(arr) {
      if (Array.isArray(arr)) return _arrayLikeToArray(arr);
    }

    function _arrayWithHoles$2(arr) {
      if (Array.isArray(arr)) return arr;
    }

    function _iterableToArray$1(iter) {
      if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
    }

    function _iterableToArrayLimit$2(arr, i) {
      var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

      if (_i == null) return;
      var _arr = [];
      var _n = true;
      var _d = false;

      var _s, _e;

      try {
        for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

      return arr2;
    }

    function _nonIterableSpread$1() {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    function _nonIterableRest$2() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    function _createForOfIteratorHelper(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

      if (!it) {
        if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
          if (it) o = it;
          var i = 0;

          var F = function () {};

          return {
            s: F,
            n: function () {
              if (i >= o.length) return {
                done: true
              };
              return {
                done: false,
                value: o[i++]
              };
            },
            e: function (e) {
              throw e;
            },
            f: F
          };
        }

        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }

      var normalCompletion = true,
          didErr = false,
          err;
      return {
        s: function () {
          it = it.call(o);
        },
        n: function () {
          var step = it.next();
          normalCompletion = step.done;
          return step;
        },
        e: function (e) {
          didErr = true;
          err = e;
        },
        f: function () {
          try {
            if (!normalCompletion && it.return != null) it.return();
          } finally {
            if (didErr) throw err;
          }
        }
      };
    }

    var Component$1 = /*#__PURE__*/_createClass$2(function Component(name) {
      _classCallCheck$2(this, Component);

      _defineProperty$1(this, "name", void 0);

      _defineProperty$1(this, "data", {});

      _defineProperty$1(this, "engine", null);

      this.name = name;
    });

    var Node = /*#__PURE__*/function () {
      function Node(name) {
        _classCallCheck$2(this, Node);

        _defineProperty$1(this, "name", void 0);

        _defineProperty$1(this, "id", void 0);

        _defineProperty$1(this, "position", [0.0, 0.0]);

        _defineProperty$1(this, "inputs", new Map());

        _defineProperty$1(this, "outputs", new Map());

        _defineProperty$1(this, "controls", new Map());

        _defineProperty$1(this, "data", {});

        _defineProperty$1(this, "meta", {});

        this.name = name;
        this.id = Node.incrementId();
      }

      _createClass$2(Node, [{
        key: "_add",
        value: function _add(list, item, prop) {
          if (list.has(item.key)) throw new Error("Item with key '".concat(item.key, "' already been added to the node"));
          if (item[prop] !== null) throw new Error('Item has already been added to some node');
          item[prop] = this;
          list.set(item.key, item);
        }
      }, {
        key: "addControl",
        value: function addControl(control) {
          this._add(this.controls, control, 'parent');

          return this;
        }
      }, {
        key: "removeControl",
        value: function removeControl(control) {
          control.parent = null;
          this.controls["delete"](control.key);
        }
      }, {
        key: "addInput",
        value: function addInput(input) {
          this._add(this.inputs, input, 'node');

          return this;
        }
      }, {
        key: "removeInput",
        value: function removeInput(input) {
          input.removeConnections();
          input.node = null;
          this.inputs["delete"](input.key);
        }
      }, {
        key: "addOutput",
        value: function addOutput(output) {
          this._add(this.outputs, output, 'node');

          return this;
        }
      }, {
        key: "removeOutput",
        value: function removeOutput(output) {
          output.removeConnections();
          output.node = null;
          this.outputs["delete"](output.key);
        }
      }, {
        key: "setMeta",
        value: function setMeta(meta) {
          this.meta = meta;
          return this;
        }
      }, {
        key: "getConnections",
        value: function getConnections() {
          var ios = [].concat(_toConsumableArray$1(this.inputs.values()), _toConsumableArray$1(this.outputs.values()));
          var connections = ios.reduce(function (arr, io) {
            return [].concat(_toConsumableArray$1(arr), _toConsumableArray$1(io.connections));
          }, []);
          return connections;
        }
      }, {
        key: "update",
        value: function update() {}
      }, {
        key: "toJSON",
        value: function toJSON() {
          var reduceIO = function reduceIO(list) {
            return Array.from(list).reduce(function (obj, _ref) {
              var _ref2 = _slicedToArray$2(_ref, 2),
                  key = _ref2[0],
                  io = _ref2[1];

              obj[key] = io.toJSON();
              return obj;
            }, {});
          };

          return {
            'id': this.id,
            'data': this.data,
            'inputs': reduceIO(this.inputs),
            'outputs': reduceIO(this.outputs),
            'position': this.position,
            'name': this.name
          };
        }
      }], [{
        key: "incrementId",
        value: function incrementId() {
          if (!this.latestId) this.latestId = 1;else this.latestId++;
          return this.latestId;
        }
      }, {
        key: "resetId",
        value: function resetId() {
          this.latestId = 0;
        }
      }, {
        key: "fromJSON",
        value: function fromJSON(json) {
          var node = new Node(json.name);

          var _json$position = _slicedToArray$2(json.position, 2),
              x = _json$position[0],
              y = _json$position[1];

          node.id = json.id;
          node.data = json.data;
          node.position = [x, y];
          node.name = json.name;
          Node.latestId = Math.max(node.id, Node.latestId);
          return node;
        }
      }]);

      return Node;
    }();

    _defineProperty$1(Node, "latestId", 0);

    var Component = /*#__PURE__*/function (_ComponentWorker) {
      _inherits(Component, _ComponentWorker);

      var _super = _createSuper(Component);

      function Component(name) {
        var _this;

        _classCallCheck$2(this, Component);

        _this = _super.call(this, name);

        _defineProperty$1(_assertThisInitialized(_this), "editor", null);

        _defineProperty$1(_assertThisInitialized(_this), "data", {});

        return _this;
      }

      _createClass$2(Component, [{
        key: "build",
        value: function () {
          var _build = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(node) {
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    _context.next = 2;
                    return this.builder(node);

                  case 2:
                    return _context.abrupt("return", node);

                  case 3:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee, this);
          }));

          function build(_x) {
            return _build.apply(this, arguments);
          }

          return build;
        }()
      }, {
        key: "createNode",
        value: function () {
          var _createNode = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
            var data,
                node,
                _args2 = arguments;
            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    data = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : {};
                    node = new Node(this.name);
                    node.data = data;
                    _context2.next = 5;
                    return this.build(node);

                  case 5:
                    return _context2.abrupt("return", node);

                  case 6:
                  case "end":
                    return _context2.stop();
                }
              }
            }, _callee2, this);
          }));

          function createNode() {
            return _createNode.apply(this, arguments);
          }

          return createNode;
        }()
      }]);

      return Component;
    }(Component$1);

    var Connection = /*#__PURE__*/function () {
      function Connection(output, input) {
        _classCallCheck$2(this, Connection);

        _defineProperty$1(this, "output", void 0);

        _defineProperty$1(this, "input", void 0);

        _defineProperty$1(this, "data", {});

        this.output = output;
        this.input = input;
        this.data = {};
        this.input.addConnection(this);
      }

      _createClass$2(Connection, [{
        key: "remove",
        value: function remove() {
          this.input.removeConnection(this);
          this.output.removeConnection(this);
        }
      }]);

      return Connection;
    }();

    var Control = /*#__PURE__*/function () {
      function Control(key) {
        _classCallCheck$2(this, Control);

        _defineProperty$1(this, "key", void 0);

        _defineProperty$1(this, "data", {});

        _defineProperty$1(this, "parent", null);

        if (this.constructor === Control) throw new TypeError('Can not construct abstract class');
        if (!key) throw new Error('The key parameter is missing in super() of Control ');
        this.key = key;
      }

      _createClass$2(Control, [{
        key: "getNode",
        value: function getNode() {
          if (this.parent === null) throw new Error('Control isn\'t added to Node/Input');
          if (this.parent instanceof Node) return this.parent;
          if (!this.parent.node) throw new Error('Control hasn\'t be added to Input or Node');
          return this.parent.node;
        }
      }, {
        key: "getData",
        value: function getData(key) {
          return this.getNode().data[key];
        }
      }, {
        key: "putData",
        value: function putData(key, data) {
          this.getNode().data[key] = data;
        }
      }]);

      return Control;
    }();

    var Emitter = /*#__PURE__*/function () {
      function Emitter(events) {
        _classCallCheck$2(this, Emitter);

        _defineProperty$1(this, "events", {});

        _defineProperty$1(this, "silent", false);

        this.events = events instanceof Emitter ? events.events : events.handlers;
      }

      _createClass$2(Emitter, [{
        key: "on",
        value: function on(names, handler) {
          var _this = this;

          var events = names instanceof Array ? names : names.split(' ');
          events.forEach(function (name) {
            if (!_this.events[name]) throw new Error("The event ".concat(name, " does not exist"));

            _this.events[name].push(handler);
          });
          return this;
        }
      }, {
        key: "trigger",
        value: function trigger(name) {
          var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
          if (!(name in this.events)) throw new Error("The event ".concat(String(name), " cannot be triggered"));
          return this.events[name].reduce(function (r, e) {
            return e(params) !== false && r;
          }, true); // return false if at least one event is false
        }
      }, {
        key: "bind",
        value: function bind(name) {
          if (this.events[name]) throw new Error("The event ".concat(name, " is already bound"));
          this.events[name] = [];
        }
      }, {
        key: "exist",
        value: function exist(name) {
          return Array.isArray(this.events[name]);
        }
      }]);

      return Emitter;
    }();

    var IO = /*#__PURE__*/function () {
      function IO(key, name, socket, multiConns) {
        _classCallCheck$2(this, IO);

        _defineProperty$1(this, "node", null);

        _defineProperty$1(this, "multipleConnections", void 0);

        _defineProperty$1(this, "connections", []);

        _defineProperty$1(this, "key", void 0);

        _defineProperty$1(this, "name", void 0);

        _defineProperty$1(this, "socket", void 0);

        this.node = null;
        this.multipleConnections = multiConns;
        this.connections = [];
        this.key = key;
        this.name = name;
        this.socket = socket;
      }

      _createClass$2(IO, [{
        key: "removeConnection",
        value: function removeConnection(connection) {
          this.connections.splice(this.connections.indexOf(connection), 1);
        }
      }, {
        key: "removeConnections",
        value: function removeConnections() {
          var _this = this;

          this.connections.forEach(function (connection) {
            return _this.removeConnection(connection);
          });
        }
      }]);

      return IO;
    }();

    var Input = /*#__PURE__*/function (_IO) {
      _inherits(Input, _IO);

      var _super = _createSuper(Input);

      function Input(key, title, socket) {
        var _this;

        var multiConns = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

        _classCallCheck$2(this, Input);

        _this = _super.call(this, key, title, socket, multiConns);

        _defineProperty$1(_assertThisInitialized(_this), "control", null);

        return _this;
      }

      _createClass$2(Input, [{
        key: "hasConnection",
        value: function hasConnection() {
          return this.connections.length > 0;
        }
      }, {
        key: "addConnection",
        value: function addConnection(connection) {
          if (!this.multipleConnections && this.hasConnection()) throw new Error('Multiple connections not allowed');
          this.connections.push(connection);
        }
      }, {
        key: "addControl",
        value: function addControl(control) {
          this.control = control;
          control.parent = this;
        }
      }, {
        key: "showControl",
        value: function showControl() {
          return !this.hasConnection() && this.control !== null;
        }
      }, {
        key: "toJSON",
        value: function toJSON() {
          return {
            'connections': this.connections.map(function (c) {
              if (!c.output.node) throw new Error('Node not added to Output');
              return {
                node: c.output.node.id,
                output: c.output.key,
                data: c.data
              };
            })
          };
        }
      }]);

      return Input;
    }(IO);

    var Validator = /*#__PURE__*/function () {
      function Validator() {
        _classCallCheck$2(this, Validator);
      }

      _createClass$2(Validator, null, [{
        key: "isValidData",
        value: function isValidData(data) {
          return typeof data.id === 'string' && this.isValidId(data.id) && data.nodes instanceof Object && !(data.nodes instanceof Array);
        }
      }, {
        key: "isValidId",
        value: function isValidId(id) {
          return /^[\w-]{3,}@[0-9]+\.[0-9]+\.[0-9]+$/.test(id);
        }
      }, {
        key: "validate",
        value: function validate(id, data) {
          var id1 = id.split('@');
          var id2 = data.id.split('@');
          var msg = [];
          if (!this.isValidData(data)) msg.push('Data is not suitable');
          if (id !== data.id) msg.push('IDs not equal');
          if (id1[0] !== id2[0]) msg.push('Names don\'t match');
          if (id1[1] !== id2[1]) msg.push('Versions don\'t match');
          return {
            success: Boolean(!msg.length),
            msg: msg.join('. ')
          };
        }
      }]);

      return Validator;
    }();

    var Context = /*#__PURE__*/function (_Emitter) {
      _inherits(Context, _Emitter);

      var _super = _createSuper(Context);

      function Context(id, events) {
        var _this;

        _classCallCheck$2(this, Context);

        _this = _super.call(this, events);

        _defineProperty$1(_assertThisInitialized(_this), "id", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "plugins", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "components", void 0);

        if (!Validator.isValidId(id)) throw new Error('ID should be valid to name@0.1.0 format');
        _this.id = id;
        _this.plugins = new Map();
        _this.components = new Map();
        return _this;
      }

      _createClass$2(Context, [{
        key: "use",
        value: function use(plugin, options) {
          if (plugin.name && this.plugins.has(plugin.name)) throw new Error("Plugin ".concat(plugin.name, " already in use"));
          plugin.install(this, options || {});
          this.plugins.set(plugin.name, options);
        }
      }, {
        key: "register",
        value: function register(component) {
          if (this.components.has(component.name)) throw new Error("Component ".concat(component.name, " already registered"));
          this.components.set(component.name, component);
          this.trigger('componentregister', component);
        }
      }, {
        key: "destroy",
        value: function destroy() {
          this.trigger('destroy');
        }
      }]);

      return Context;
    }(Emitter);

    function listenWindow(event, handler) {
      window.addEventListener(event, handler);
      return function () {
        window.removeEventListener(event, handler);
      };
    }
    function getOffset(el, offsetParentEl) {
      var searchDepth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 8;
      var x = el.offsetLeft;
      var y = el.offsetTop;
      var parent = el.offsetParent;

      while (parent && parent !== offsetParentEl && searchDepth > 0) {
        searchDepth--;
        x += parent.offsetLeft;
        y += parent.offsetTop;
        parent = parent.offsetParent;
      }

      return {
        x: x,
        y: y
      };
    }

    var Drag = /*#__PURE__*/function () {
      function Drag(el) {
        var onTranslate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (_x, _y, _e) {};
        var onStart = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (_e) {};
        var onDrag = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (_e) {};

        _classCallCheck$2(this, Drag);

        this.onTranslate = onTranslate;
        this.onStart = onStart;
        this.onDrag = onDrag;

        _defineProperty$1(this, "pointerStart", void 0);

        _defineProperty$1(this, "el", void 0);

        _defineProperty$1(this, "destroy", void 0);

        this.pointerStart = null;
        this.el = el;
        this.el.style.touchAction = 'none';
        this.el.addEventListener('pointerdown', this.down.bind(this));
        var destroyMove = listenWindow('pointermove', this.move.bind(this));
        var destroyUp = listenWindow('pointerup', this.up.bind(this));

        this.destroy = function () {
          destroyMove();
          destroyUp();
        };
      }

      _createClass$2(Drag, [{
        key: "down",
        value: function down(e) {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.stopPropagation();
          this.pointerStart = [e.pageX, e.pageY];
          this.onStart(e);
        }
      }, {
        key: "move",
        value: function move(e) {
          if (!this.pointerStart) return;
          e.preventDefault();
          var _ref = [e.pageX, e.pageY],
              x = _ref[0],
              y = _ref[1];
          var delta = [x - this.pointerStart[0], y - this.pointerStart[1]];
          var zoom = this.el.getBoundingClientRect().width / this.el.offsetWidth;
          this.onTranslate(delta[0] / zoom, delta[1] / zoom, e);
        }
      }, {
        key: "up",
        value: function up(e) {
          if (!this.pointerStart) return;
          this.pointerStart = null;
          this.onDrag(e);
        }
      }]);

      return Drag;
    }();

    var Zoom = /*#__PURE__*/function () {
      function Zoom(container, el, intensity, onzoom) {
        _classCallCheck$2(this, Zoom);

        _defineProperty$1(this, "el", void 0);

        _defineProperty$1(this, "intensity", void 0);

        _defineProperty$1(this, "onzoom", void 0);

        _defineProperty$1(this, "previous", null);

        _defineProperty$1(this, "pointers", []);

        _defineProperty$1(this, "destroy", void 0);

        this.el = el;
        this.intensity = intensity;
        this.onzoom = onzoom;
        container.addEventListener('wheel', this.wheel.bind(this));
        container.addEventListener('pointerdown', this.down.bind(this));
        container.addEventListener('dblclick', this.dblclick.bind(this));
        var destroyMove = listenWindow('pointermove', this.move.bind(this));
        var destroyUp = listenWindow('pointerup', this.end.bind(this));
        var destroyCancel = listenWindow('pointercancel', this.end.bind(this));

        this.destroy = function () {
          destroyMove();
          destroyUp();
          destroyCancel();
        };
      }

      _createClass$2(Zoom, [{
        key: "translating",
        get: function get() {
          // is translating while zoom (works on multitouch)
          return this.pointers.length >= 2;
        }
      }, {
        key: "wheel",
        value: function wheel(e) {
          e.preventDefault();
          var rect = this.el.getBoundingClientRect();
          var isNegative = e.deltaY < 0;
          var delta = isNegative ? this.intensity : -this.intensity;
          var ox = (rect.left - e.clientX) * delta;
          var oy = (rect.top - e.clientY) * delta;
          this.onzoom(delta, ox, oy, 'wheel');
        }
      }, {
        key: "touches",
        value: function touches() {
          var e = {
            touches: this.pointers
          };
          var _ref = [e.touches[0].clientX, e.touches[0].clientY],
              x1 = _ref[0],
              y1 = _ref[1];
          var _ref2 = [e.touches[1].clientX, e.touches[1].clientY],
              x2 = _ref2[0],
              y2 = _ref2[1];
          var distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
          return {
            cx: (x1 + x2) / 2,
            cy: (y1 + y2) / 2,
            distance: distance
          };
        }
      }, {
        key: "down",
        value: function down(e) {
          this.pointers.push(e);
        }
      }, {
        key: "move",
        value: function move(e) {
          this.pointers = this.pointers.map(function (p) {
            return p.pointerId === e.pointerId ? e : p;
          });
          if (!this.translating) return;
          var rect = this.el.getBoundingClientRect();

          var _this$touches = this.touches(),
              cx = _this$touches.cx,
              cy = _this$touches.cy,
              distance = _this$touches.distance;

          if (this.previous !== null) {
            var delta = distance / this.previous.distance - 1;
            var ox = (rect.left - cx) * delta;
            var oy = (rect.top - cy) * delta;
            this.onzoom(delta, ox - (this.previous.cx - cx), oy - (this.previous.cy - cy), 'touch');
          }

          this.previous = {
            cx: cx,
            cy: cy,
            distance: distance
          };
        }
      }, {
        key: "end",
        value: function end(e) {
          this.previous = null;
          this.pointers = this.pointers.filter(function (p) {
            return p.pointerId !== e.pointerId;
          });
        }
      }, {
        key: "dblclick",
        value: function dblclick(e) {
          e.preventDefault();
          var rect = this.el.getBoundingClientRect();
          var delta = 4 * this.intensity;
          var ox = (rect.left - e.clientX) * delta;
          var oy = (rect.top - e.clientY) * delta;
          this.onzoom(delta, ox, oy, 'dblclick');
        }
      }]);

      return Zoom;
    }();

    var Area = /*#__PURE__*/function (_Emitter) {
      _inherits(Area, _Emitter);

      var _super = _createSuper(Area);

      function Area(container, emitter) {
        var _this;

        _classCallCheck$2(this, Area);

        _this = _super.call(this, emitter);

        _defineProperty$1(_assertThisInitialized(_this), "el", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "container", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "transform", {
          k: 1,
          x: 0,
          y: 0
        });

        _defineProperty$1(_assertThisInitialized(_this), "mouse", {
          x: 0,
          y: 0
        });

        _defineProperty$1(_assertThisInitialized(_this), "_startPosition", null);

        _defineProperty$1(_assertThisInitialized(_this), "_zoom", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "_drag", void 0);

        var el = _this.el = document.createElement('div');
        _this.container = container;
        el.style.transformOrigin = '0 0';
        _this._zoom = new Zoom(container, el, 0.1, _this.onZoom.bind(_assertThisInitialized(_this)));
        _this._drag = new Drag(container, _this.onTranslate.bind(_assertThisInitialized(_this)), _this.onStart.bind(_assertThisInitialized(_this)));
        emitter.on('destroy', function () {
          _this._zoom.destroy();

          _this._drag.destroy();
        });

        _this.container.addEventListener('pointermove', _this.pointermove.bind(_assertThisInitialized(_this)));

        _this.update();

        return _this;
      }

      _createClass$2(Area, [{
        key: "update",
        value: function update() {
          var t = this.transform;
          this.el.style.transform = "translate(".concat(t.x, "px, ").concat(t.y, "px) scale(").concat(t.k, ")");
        }
      }, {
        key: "pointermove",
        value: function pointermove(e) {
          var clientX = e.clientX,
              clientY = e.clientY;
          var rect = this.el.getBoundingClientRect();
          var x = clientX - rect.left;
          var y = clientY - rect.top;
          var k = this.transform.k;
          this.mouse = {
            x: x / k,
            y: y / k
          };
          this.trigger('mousemove', _objectSpread2({}, this.mouse)); // TODO rename on `pointermove`
        }
      }, {
        key: "onStart",
        value: function onStart() {
          this._startPosition = _objectSpread2({}, this.transform);
        }
      }, {
        key: "onTranslate",
        value: function onTranslate(dx, dy) {
          if (this._zoom.translating) return; // lock translation while zoom on multitouch

          if (this._startPosition) this.translate(this._startPosition.x + dx, this._startPosition.y + dy);
        }
      }, {
        key: "onZoom",
        value: function onZoom(delta, ox, oy, source) {
          this.zoom(this.transform.k * (1 + delta), ox, oy, source);
          this.update();
        }
      }, {
        key: "translate",
        value: function translate(x, y) {
          var params = {
            transform: this.transform,
            x: x,
            y: y
          };
          if (!this.trigger('translate', params)) return;
          this.transform.x = params.x;
          this.transform.y = params.y;
          this.update();
          this.trigger('translated');
        }
      }, {
        key: "zoom",
        value: function zoom(_zoom) {
          var ox = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
          var oy = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
          var source = arguments.length > 3 ? arguments[3] : undefined;
          var k = this.transform.k;
          var params = {
            transform: this.transform,
            zoom: _zoom,
            source: source
          };
          if (!this.trigger('zoom', params)) return;
          var d = (k - params.zoom) / (k - _zoom || 1);
          this.transform.k = params.zoom || 1;
          this.transform.x += ox * d;
          this.transform.y += oy * d;
          this.update();
          this.trigger('zoomed', {
            source: source
          });
        }
      }, {
        key: "appendChild",
        value: function appendChild(el) {
          this.el.appendChild(el);
        }
      }, {
        key: "removeChild",
        value: function removeChild(el) {
          this.el.removeChild(el);
        }
      }]);

      return Area;
    }(Emitter);

    var ConnectionView = /*#__PURE__*/function (_Emitter) {
      _inherits(ConnectionView, _Emitter);

      var _super = _createSuper(ConnectionView);

      function ConnectionView(connection, inputNode, outputNode, emitter) {
        var _this;

        _classCallCheck$2(this, ConnectionView);

        _this = _super.call(this, emitter);

        _defineProperty$1(_assertThisInitialized(_this), "connection", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "inputNode", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "outputNode", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "el", void 0);

        _this.connection = connection;
        _this.inputNode = inputNode;
        _this.outputNode = outputNode;
        _this.el = document.createElement('div');
        _this.el.style.position = 'absolute';
        _this.el.style.zIndex = '-1';

        _this.trigger('renderconnection', {
          el: _this.el,
          connection: _this.connection,
          points: _this.getPoints()
        });

        return _this;
      }

      _createClass$2(ConnectionView, [{
        key: "getPoints",
        value: function getPoints() {
          var _this$connection = this.connection,
              input = _this$connection.input,
              output = _this$connection.output;

          if (this.inputNode.hasSocket(input) && this.outputNode.hasSocket(output)) {
            var _this$outputNode$getS = this.outputNode.getSocketPosition(output),
                _this$outputNode$getS2 = _slicedToArray$2(_this$outputNode$getS, 2),
                x1 = _this$outputNode$getS2[0],
                y1 = _this$outputNode$getS2[1];

            var _this$inputNode$getSo = this.inputNode.getSocketPosition(input),
                _this$inputNode$getSo2 = _slicedToArray$2(_this$inputNode$getSo, 2),
                x2 = _this$inputNode$getSo2[0],
                y2 = _this$inputNode$getSo2[1];

            return [x1, y1, x2, y2];
          }

          return [0, 0, 0, 0];
        }
      }, {
        key: "update",
        value: function update() {
          this.trigger('updateconnection', {
            el: this.el,
            connection: this.connection,
            points: this.getPoints()
          });
        }
      }]);

      return ConnectionView;
    }(Emitter);

    var ControlView = /*#__PURE__*/function (_Emitter) {
      _inherits(ControlView, _Emitter);

      var _super = _createSuper(ControlView);

      function ControlView(el, control, emitter) {
        var _this;

        _classCallCheck$2(this, ControlView);

        _this = _super.call(this, emitter);

        _this.trigger('rendercontrol', {
          el: el,
          control: control
        });

        return _this;
      }

      return _createClass$2(ControlView);
    }(Emitter);

    var SocketView = /*#__PURE__*/function (_Emitter) {
      _inherits(SocketView, _Emitter);

      var _super = _createSuper(SocketView);

      function SocketView(el, type, io, node, emitter) {
        var _this$trigger;

        var _this;

        _classCallCheck$2(this, SocketView);

        _this = _super.call(this, emitter);

        _defineProperty$1(_assertThisInitialized(_this), "el", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "type", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "io", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "node", void 0);

        _this.el = el;
        _this.type = type;
        _this.io = io;
        _this.node = node;

        _this.trigger('rendersocket', (_this$trigger = {
          el: el
        }, _defineProperty$1(_this$trigger, type, _this.io), _defineProperty$1(_this$trigger, "socket", io.socket), _this$trigger));

        return _this;
      }

      _createClass$2(SocketView, [{
        key: "getPosition",
        value: function getPosition(_ref, nodeViewEl) {
          var position = _ref.position;
          var el = this.el;

          var _getOffset = getOffset(el, nodeViewEl),
              x = _getOffset.x,
              y = _getOffset.y;

          return [position[0] + x + el.offsetWidth / 2, position[1] + y + el.offsetHeight / 2];
        }
      }]);

      return SocketView;
    }(Emitter);

    var NodeView = /*#__PURE__*/function (_Emitter) {
      _inherits(NodeView, _Emitter);

      var _super = _createSuper(NodeView);

      function NodeView(node, component, emitter) {
        var _this;

        _classCallCheck$2(this, NodeView);

        _this = _super.call(this, emitter);

        _defineProperty$1(_assertThisInitialized(_this), "node", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "component", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "sockets", new Map());

        _defineProperty$1(_assertThisInitialized(_this), "controls", new Map());

        _defineProperty$1(_assertThisInitialized(_this), "el", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "_startPosition", []);

        _defineProperty$1(_assertThisInitialized(_this), "_drag", void 0);

        _this.node = node;
        _this.component = component;
        _this.el = document.createElement('div');
        _this.el.style.position = 'absolute';

        _this.el.addEventListener('contextmenu', function (e) {
          return _this.trigger('contextmenu', {
            e: e,
            node: _this.node
          });
        });

        _this._drag = new Drag(_this.el, _this.onTranslate.bind(_assertThisInitialized(_this)), _this.onSelect.bind(_assertThisInitialized(_this)), function () {
          _this.trigger('nodedraged', node);

          _this.trigger('nodedragged', node);
        });

        _this.trigger('rendernode', {
          el: _this.el,
          node: node,
          component: component.data,
          bindSocket: _this.bindSocket.bind(_assertThisInitialized(_this)),
          bindControl: _this.bindControl.bind(_assertThisInitialized(_this))
        });

        _this.update();

        return _this;
      }

      _createClass$2(NodeView, [{
        key: "clearSockets",
        value: function clearSockets() {
          var _this2 = this;

          var ios = [].concat(_toConsumableArray$1(this.node.inputs.values()), _toConsumableArray$1(this.node.outputs.values()));
          this.sockets.forEach(function (s) {
            if (!ios.includes(s.io)) _this2.sockets["delete"](s.io);
          });
        }
      }, {
        key: "bindSocket",
        value: function bindSocket(el, type, io) {
          this.clearSockets();
          this.sockets.set(io, new SocketView(el, type, io, this.node, this));
        }
      }, {
        key: "bindControl",
        value: function bindControl(el, control) {
          this.controls.set(control, new ControlView(el, control, this));
        }
      }, {
        key: "hasSocket",
        value: function hasSocket(io) {
          return this.sockets.has(io);
        }
      }, {
        key: "getSocketPosition",
        value: function getSocketPosition(io) {
          var socket = this.sockets.get(io);
          if (!socket) throw new Error("Socket not found for ".concat(io.name, " with key ").concat(io.key));
          return socket.getPosition(this.node, this.el);
        }
      }, {
        key: "onSelect",
        value: function onSelect(e) {
          var payload = {
            node: this.node,
            accumulate: e.ctrlKey,
            e: e
          };
          this.onStart();
          this.trigger('multiselectnode', payload);
          this.trigger('selectnode', payload);
        }
      }, {
        key: "onStart",
        value: function onStart() {
          this._startPosition = _toConsumableArray$1(this.node.position);
        }
      }, {
        key: "onTranslate",
        value: function onTranslate(dx, dy) {
          this.trigger('translatenode', {
            node: this.node,
            dx: dx,
            dy: dy
          });
        }
      }, {
        key: "onDrag",
        value: function onDrag(dx, dy) {
          var x = this._startPosition[0] + dx;
          var y = this._startPosition[1] + dy;
          this.translate(x, y);
        }
      }, {
        key: "translate",
        value: function translate(x, y) {
          var node = this.node;
          var params = {
            node: node,
            x: x,
            y: y
          };
          if (!this.trigger('nodetranslate', params)) return;

          var _node$position = _slicedToArray$2(node.position, 2),
              px = _node$position[0],
              py = _node$position[1];

          var prev = [px, py];
          node.position[0] = params.x;
          node.position[1] = params.y;
          this.update();
          this.trigger('nodetranslated', {
            node: node,
            prev: prev
          });
        }
      }, {
        key: "update",
        value: function update() {
          var _this$node$position = _slicedToArray$2(this.node.position, 2),
              x = _this$node$position[0],
              y = _this$node$position[1];

          this.el.style.transform = "translate(".concat(x, "px, ").concat(y, "px)");
        }
      }, {
        key: "remove",
        value: function remove() {}
      }, {
        key: "destroy",
        value: function destroy() {
          this._drag.destroy();
        }
      }]);

      return NodeView;
    }(Emitter);

    var EditorView = /*#__PURE__*/function (_Emitter) {
      _inherits(EditorView, _Emitter);

      var _super = _createSuper(EditorView);

      // eslint-disable-next-line max-statements
      function EditorView(container, components, emitter) {
        var _this;

        _classCallCheck$2(this, EditorView);

        _this = _super.call(this, emitter);

        _defineProperty$1(_assertThisInitialized(_this), "container", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "components", void 0);

        _defineProperty$1(_assertThisInitialized(_this), "nodes", new Map());

        _defineProperty$1(_assertThisInitialized(_this), "connections", new Map());

        _defineProperty$1(_assertThisInitialized(_this), "area", void 0);

        _this.container = container;
        _this.components = components;
        _this.container.style.overflow = 'hidden';

        _this.container.addEventListener('click', _this.click.bind(_assertThisInitialized(_this)));

        _this.container.addEventListener('contextmenu', function (e) {
          return _this.trigger('contextmenu', {
            e: e,
            view: _assertThisInitialized(_this)
          });
        });

        emitter.on('destroy', listenWindow('resize', _this.resize.bind(_assertThisInitialized(_this))));
        emitter.on('destroy', function () {
          return _this.nodes.forEach(function (view) {
            return view.destroy();
          });
        });

        _this.on('nodetranslated', _this.updateConnections.bind(_assertThisInitialized(_this)));

        _this.on('rendersocket', function (_ref) {
          var input = _ref.input,
              output = _ref.output;
          var connections = Array.from(_this.connections.entries());
          var relatedConnections = connections.filter(function (_ref2) {
            var _ref3 = _slicedToArray$2(_ref2, 1),
                connection = _ref3[0];

            return connection.input === input || connection.output === output;
          });
          relatedConnections.forEach(function (_ref4) {
            var _ref5 = _slicedToArray$2(_ref4, 2);
                _ref5[0];
                var view = _ref5[1];

            return requestAnimationFrame(function () {
              return view.update();
            });
          });
        });

        _this.area = new Area(container, _assertThisInitialized(_this));

        _this.container.appendChild(_this.area.el);

        return _this;
      }

      _createClass$2(EditorView, [{
        key: "addNode",
        value: function addNode(node) {
          var component = this.components.get(node.name);
          if (!component) throw new Error("Component ".concat(node.name, " not found"));
          var nodeView = new NodeView(node, component, this);
          this.nodes.set(node, nodeView);
          this.area.appendChild(nodeView.el);
        }
      }, {
        key: "removeNode",
        value: function removeNode(node) {
          var nodeView = this.nodes.get(node);
          this.nodes["delete"](node);

          if (nodeView) {
            this.area.removeChild(nodeView.el);
            nodeView.destroy();
          }
        }
      }, {
        key: "addConnection",
        value: function addConnection(connection) {
          if (!connection.input.node || !connection.output.node) throw new Error('Connection input or output not added to node');
          var viewInput = this.nodes.get(connection.input.node);
          var viewOutput = this.nodes.get(connection.output.node);
          if (!viewInput || !viewOutput) throw new Error('View node not found for input or output');
          var connView = new ConnectionView(connection, viewInput, viewOutput, this);
          this.connections.set(connection, connView);
          this.area.appendChild(connView.el);
        }
      }, {
        key: "removeConnection",
        value: function removeConnection(connection) {
          var connView = this.connections.get(connection);
          this.connections["delete"](connection);
          if (connView) this.area.removeChild(connView.el);
        }
      }, {
        key: "updateConnections",
        value: function updateConnections(_ref6) {
          var _this2 = this;

          var node = _ref6.node;
          node.getConnections().forEach(function (conn) {
            var connView = _this2.connections.get(conn);

            if (!connView) throw new Error('Connection view not found');
            connView.update();
          });
        }
      }, {
        key: "resize",
        value: function resize() {
          var container = this.container;
          if (!container.parentElement) throw new Error('Container doesn\'t have parent element');
          var width = container.parentElement.clientWidth;
          var height = container.parentElement.clientHeight;
          container.style.width = width + 'px';
          container.style.height = height + 'px';
        }
      }, {
        key: "click",
        value: function click(e) {
          var container = this.container;
          if (container !== e.target) return;
          if (!this.trigger('click', {
            e: e,
            container: container
          })) return;
        }
      }]);

      return EditorView;
    }(Emitter);

    var Selected = /*#__PURE__*/function () {
      function Selected() {
        _classCallCheck$2(this, Selected);

        _defineProperty$1(this, "list", []);
      }

      _createClass$2(Selected, [{
        key: "add",
        value: function add(item) {
          var accumulate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
          if (!accumulate) this.list = [item];else if (!this.contains(item)) this.list.push(item);
        }
      }, {
        key: "clear",
        value: function clear() {
          this.list = [];
        }
      }, {
        key: "remove",
        value: function remove(item) {
          this.list.splice(this.list.indexOf(item), 1);
        }
      }, {
        key: "contains",
        value: function contains(item) {
          return this.list.indexOf(item) !== -1;
        }
      }, {
        key: "each",
        value: function each(callback) {
          this.list.forEach(callback);
        }
      }]);

      return Selected;
    }();

    var Events = /*#__PURE__*/_createClass$2(function Events(handlers) {
      _classCallCheck$2(this, Events);

      _defineProperty$1(this, "handlers", void 0);

      this.handlers = _objectSpread2({
        warn: [console.warn],
        error: [console.error],
        componentregister: [],
        destroy: []
      }, handlers);
    });

    var EditorEvents = /*#__PURE__*/function (_Events) {
      _inherits(EditorEvents, _Events);

      var _super = _createSuper(EditorEvents);

      function EditorEvents() {
        _classCallCheck$2(this, EditorEvents);

        return _super.call(this, {
          nodecreate: [],
          nodecreated: [],
          noderemove: [],
          noderemoved: [],
          connectioncreate: [],
          connectioncreated: [],
          connectionremove: [],
          connectionremoved: [],
          translatenode: [],
          nodetranslate: [],
          nodetranslated: [],
          nodedraged: [],
          nodedragged: [],
          selectnode: [],
          multiselectnode: [],
          nodeselect: [],
          nodeselected: [],
          rendernode: [],
          rendersocket: [],
          rendercontrol: [],
          renderconnection: [],
          updateconnection: [],
          keydown: [],
          keyup: [],
          translate: [],
          translated: [],
          zoom: [],
          zoomed: [],
          click: [],
          mousemove: [],
          contextmenu: [],
          "import": [],
          "export": [],
          process: [],
          clear: []
        });
      }

      return _createClass$2(EditorEvents);
    }(Events);

    var NodeEditor$1 = /*#__PURE__*/function (_Context) {
      _inherits(NodeEditor, _Context);

      var _super = _createSuper(NodeEditor);

      function NodeEditor(id, container) {
        var _this;

        _classCallCheck$2(this, NodeEditor);

        _this = _super.call(this, id, new EditorEvents());

        _defineProperty$1(_assertThisInitialized(_this), "nodes", []);

        _defineProperty$1(_assertThisInitialized(_this), "selected", new Selected());

        _defineProperty$1(_assertThisInitialized(_this), "view", void 0);

        _this.view = new EditorView(container, _this.components, _assertThisInitialized(_this));

        _this.on('destroy', listenWindow('keydown', function (e) {
          return _this.trigger('keydown', e);
        }));

        _this.on('destroy', listenWindow('keyup', function (e) {
          return _this.trigger('keyup', e);
        }));

        _this.on('selectnode', function (_ref) {
          var node = _ref.node,
              accumulate = _ref.accumulate;
          return _this.selectNode(node, accumulate);
        });

        _this.on('nodeselected', function () {
          return _this.selected.each(function (n) {
            var nodeView = _this.view.nodes.get(n);

            nodeView && nodeView.onStart();
          });
        });

        _this.on('translatenode', function (_ref2) {
          var dx = _ref2.dx,
              dy = _ref2.dy;
          return _this.selected.each(function (n) {
            var nodeView = _this.view.nodes.get(n);

            nodeView && nodeView.onDrag(dx, dy);
          });
        });

        return _this;
      }

      _createClass$2(NodeEditor, [{
        key: "addNode",
        value: function addNode(node) {
          if (!this.trigger('nodecreate', node)) return;
          this.nodes.push(node);
          this.view.addNode(node);
          this.trigger('nodecreated', node);
        }
      }, {
        key: "removeNode",
        value: function removeNode(node) {
          var _this2 = this;

          if (!this.trigger('noderemove', node)) return;
          node.getConnections().forEach(function (c) {
            return _this2.removeConnection(c);
          });
          this.nodes.splice(this.nodes.indexOf(node), 1);
          this.view.removeNode(node);
          this.trigger('noderemoved', node);
        }
      }, {
        key: "connect",
        value: function connect(output, input) {
          var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
          if (!this.trigger('connectioncreate', {
            output: output,
            input: input
          })) return;

          try {
            var connection = output.connectTo(input);
            connection.data = data;
            this.view.addConnection(connection);
            this.trigger('connectioncreated', connection);
          } catch (e) {
            this.trigger('warn', e);
          }
        }
      }, {
        key: "removeConnection",
        value: function removeConnection(connection) {
          if (!this.trigger('connectionremove', connection)) return;
          this.view.removeConnection(connection);
          connection.remove();
          this.trigger('connectionremoved', connection);
        }
      }, {
        key: "selectNode",
        value: function selectNode(node) {
          var accumulate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
          if (this.nodes.indexOf(node) === -1) throw new Error('Node not exist in list');
          if (!this.trigger('nodeselect', node)) return;
          this.selected.add(node, accumulate);
          this.trigger('nodeselected', node);
        }
      }, {
        key: "getComponent",
        value: function getComponent(name) {
          var component = this.components.get(name);
          if (!component) throw "Component ".concat(name, " not found");
          return component;
        }
      }, {
        key: "register",
        value: function register(component) {
          _get(_getPrototypeOf(NodeEditor.prototype), "register", this).call(this, component);

          component.editor = this;
        }
      }, {
        key: "clear",
        value: function clear() {
          var _this3 = this;

          _toConsumableArray$1(this.nodes).forEach(function (node) {
            return _this3.removeNode(node);
          });

          this.trigger('clear');
        }
      }, {
        key: "toJSON",
        value: function toJSON() {
          var data = {
            id: this.id,
            nodes: {}
          };
          this.nodes.forEach(function (node) {
            return data.nodes[node.id] = node.toJSON();
          });
          this.trigger('export', data);
          return data;
        }
      }, {
        key: "beforeImport",
        value: function beforeImport(json) {
          var checking = Validator.validate(this.id, json);

          if (!checking.success) {
            this.trigger('warn', checking.msg);
            return false;
          }

          this.silent = true;
          this.clear();
          this.trigger('import', json);
          return true;
        }
      }, {
        key: "afterImport",
        value: function afterImport() {
          this.silent = false;
          return true;
        }
      }, {
        key: "fromJSON",
        value: function () {
          var _fromJSON = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(json) {
            var _this4 = this;

            var nodes;
            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    if (this.beforeImport(json)) {
                      _context2.next = 2;
                      break;
                    }

                    return _context2.abrupt("return", false);

                  case 2:
                    nodes = {};
                    _context2.prev = 3;
                    _context2.next = 6;
                    return Promise.all(Object.keys(json.nodes).map( /*#__PURE__*/function () {
                      var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(id) {
                        var node, component;
                        return _regeneratorRuntime().wrap(function _callee$(_context) {
                          while (1) {
                            switch (_context.prev = _context.next) {
                              case 0:
                                node = json.nodes[id];
                                component = _this4.getComponent(node.name);
                                _context.next = 4;
                                return component.build(Node.fromJSON(node));

                              case 4:
                                nodes[id] = _context.sent;

                                _this4.addNode(nodes[id]);

                              case 6:
                              case "end":
                                return _context.stop();
                            }
                          }
                        }, _callee);
                      }));

                      return function (_x2) {
                        return _ref3.apply(this, arguments);
                      };
                    }()));

                  case 6:
                    Object.keys(json.nodes).forEach(function (id) {
                      var jsonNode = json.nodes[id];
                      var node = nodes[id];
                      Object.keys(jsonNode.outputs).forEach(function (key) {
                        var outputJson = jsonNode.outputs[key];
                        outputJson.connections.forEach(function (jsonConnection) {
                          var nodeId = jsonConnection.node;
                          var data = jsonConnection.data;
                          var targetOutput = node.outputs.get(key);
                          var targetInput = nodes[nodeId].inputs.get(jsonConnection.input);

                          if (!targetOutput || !targetInput) {
                            return _this4.trigger('error', "IO not found for node ".concat(node.id));
                          }

                          _this4.connect(targetOutput, targetInput, data);
                        });
                      });
                    });
                    _context2.next = 13;
                    break;

                  case 9:
                    _context2.prev = 9;
                    _context2.t0 = _context2["catch"](3);
                    this.trigger('warn', _context2.t0);
                    return _context2.abrupt("return", !this.afterImport());

                  case 13:
                    return _context2.abrupt("return", this.afterImport());

                  case 14:
                  case "end":
                    return _context2.stop();
                }
              }
            }, _callee2, this, [[3, 9]]);
          }));

          function fromJSON(_x) {
            return _fromJSON.apply(this, arguments);
          }

          return fromJSON;
        }()
      }]);

      return NodeEditor;
    }(Context);

    var Output = /*#__PURE__*/function (_IO) {
      _inherits(Output, _IO);

      var _super = _createSuper(Output);

      function Output(key, title, socket) {
        var multiConns = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

        _classCallCheck$2(this, Output);

        return _super.call(this, key, title, socket, multiConns);
      }

      _createClass$2(Output, [{
        key: "hasConnection",
        value: function hasConnection() {
          return this.connections.length > 0;
        }
      }, {
        key: "connectTo",
        value: function connectTo(input) {
          if (!this.socket.compatibleWith(input.socket)) throw new Error('Sockets not compatible');
          if (!input.multipleConnections && input.hasConnection()) throw new Error('Input already has one connection');
          if (!this.multipleConnections && this.hasConnection()) throw new Error('Output already has one connection');
          var connection = new Connection(this, input);
          this.connections.push(connection);
          return connection;
        }
      }, {
        key: "connectedTo",
        value: function connectedTo(input) {
          return this.connections.some(function (item) {
            return item.input === input;
          });
        }
      }, {
        key: "toJSON",
        value: function toJSON() {
          return {
            'connections': this.connections.map(function (c) {
              if (!c.input.node) throw new Error('Node not added to Input');
              return {
                node: c.input.node.id,
                input: c.input.key,
                data: c.data
              };
            })
          };
        }
      }]);

      return Output;
    }(IO);

    var Socket = /*#__PURE__*/function () {
      function Socket(name) {
        var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck$2(this, Socket);

        _defineProperty$1(this, "name", void 0);

        _defineProperty$1(this, "data", void 0);

        _defineProperty$1(this, "compatible", []);

        this.name = name;
        this.data = data;
        this.compatible = [];
      }

      _createClass$2(Socket, [{
        key: "combineWith",
        value: function combineWith(socket) {
          this.compatible.push(socket);
        }
      }, {
        key: "compatibleWith",
        value: function compatibleWith(socket) {
          return this === socket || this.compatible.includes(socket);
        }
      }]);

      return Socket;
    }();

    function intersect(array1, array2) {
      return array1.filter(function (value) {
        return -1 !== array2.indexOf(value);
      });
    }

    var Recursion = /*#__PURE__*/function () {
      function Recursion(nodes) {
        _classCallCheck$2(this, Recursion);

        _defineProperty$1(this, "nodes", void 0);

        this.nodes = nodes;
      }

      _createClass$2(Recursion, [{
        key: "extractInputNodes",
        value: function extractInputNodes(node) {
          var _this = this;

          return Object.keys(node.inputs).reduce(function (acc, key) {
            var connections = node.inputs[key].connections;
            var nodesData = (connections || []).reduce(function (b, c) {
              return [].concat(_toConsumableArray$1(b), [_this.nodes[c.node]]);
            }, []);
            return [].concat(_toConsumableArray$1(acc), _toConsumableArray$1(nodesData));
          }, []);
        }
      }, {
        key: "findSelf",
        value: function findSelf(list, inputNodes) {
          var inters = intersect(list, inputNodes);
          if (inters.length) return inters[0];

          var _iterator = _createForOfIteratorHelper(inputNodes),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var node = _step.value;
              var l = [node].concat(_toConsumableArray$1(list));
              var inter = this.findSelf(l, this.extractInputNodes(node));
              if (inter) return inter;
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }

          return null;
        }
      }, {
        key: "detect",
        value: function detect() {
          var _this2 = this;

          var nodesArr = Object.keys(this.nodes).map(function (id) {
            return _this2.nodes[id];
          });

          var _iterator2 = _createForOfIteratorHelper(nodesArr),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var node = _step2.value;
              var inters = this.findSelf([node], this.extractInputNodes(node));
              if (inters) return inters;
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }

          return null;
        }
      }]);

      return Recursion;
    }();

    var State = {
      AVAILABLE: 0,
      PROCESSED: 1,
      ABORT: 2
    };

    var EngineEvents = /*#__PURE__*/function (_Events) {
      _inherits(EngineEvents, _Events);

      var _super = _createSuper(EngineEvents);

      function EngineEvents() {
        _classCallCheck$2(this, EngineEvents);

        return _super.call(this, {});
      }

      return _createClass$2(EngineEvents);
    }(Events);

    var Engine = /*#__PURE__*/function (_Context) {
      _inherits(Engine, _Context);

      var _super = _createSuper(Engine);

      function Engine(id) {
        var _this;

        _classCallCheck$2(this, Engine);

        _this = _super.call(this, id, new EngineEvents());

        _defineProperty$1(_assertThisInitialized(_this), "args", []);

        _defineProperty$1(_assertThisInitialized(_this), "data", null);

        _defineProperty$1(_assertThisInitialized(_this), "state", State.AVAILABLE);

        _defineProperty$1(_assertThisInitialized(_this), "forwarded", new Set());

        _defineProperty$1(_assertThisInitialized(_this), "onAbort", function () {});

        return _this;
      }

      _createClass$2(Engine, [{
        key: "clone",
        value: function clone() {
          var engine = new Engine(this.id);
          this.components.forEach(function (c) {
            return engine.register(c);
          });
          return engine;
        }
      }, {
        key: "throwError",
        value: function () {
          var _throwError = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(message) {
            var data,
                _args = arguments;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    data = _args.length > 1 && _args[1] !== undefined ? _args[1] : null;
                    _context.next = 3;
                    return this.abort();

                  case 3:
                    this.trigger('error', {
                      message: message,
                      data: data
                    });
                    this.processDone();
                    return _context.abrupt("return", 'error');

                  case 6:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee, this);
          }));

          function throwError(_x) {
            return _throwError.apply(this, arguments);
          }

          return throwError;
        }()
      }, {
        key: "processStart",
        value: function processStart() {
          if (this.state === State.AVAILABLE) {
            this.state = State.PROCESSED;
            return true;
          }

          if (this.state === State.ABORT) {
            return false;
          }

          console.warn("The process is busy and has not been restarted.\n                Use abort() to force it to complete");
          return false;
        }
      }, {
        key: "processDone",
        value: function processDone() {
          var success = this.state !== State.ABORT;
          this.state = State.AVAILABLE;

          if (!success) {
            this.onAbort();

            this.onAbort = function () {};
          }

          return success;
        }
      }, {
        key: "abort",
        value: function () {
          var _abort = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
            var _this2 = this;

            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    return _context2.abrupt("return", new Promise(function (ret) {
                      if (_this2.state === State.PROCESSED) {
                        _this2.state = State.ABORT;
                        _this2.onAbort = ret;
                      } else if (_this2.state === State.ABORT) {
                        _this2.onAbort();

                        _this2.onAbort = ret;
                      } else ret();
                    }));

                  case 1:
                  case "end":
                    return _context2.stop();
                }
              }
            }, _callee2);
          }));

          function abort() {
            return _abort.apply(this, arguments);
          }

          return abort;
        }()
      }, {
        key: "lock",
        value: function () {
          var _lock = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(node) {
            return _regeneratorRuntime().wrap(function _callee3$(_context3) {
              while (1) {
                switch (_context3.prev = _context3.next) {
                  case 0:
                    return _context3.abrupt("return", new Promise(function (res) {
                      node.unlockPool = node.unlockPool || [];
                      if (node.busy && !node.outputData) node.unlockPool.push(res);else res();
                      node.busy = true;
                    }));

                  case 1:
                  case "end":
                    return _context3.stop();
                }
              }
            }, _callee3);
          }));

          function lock(_x2) {
            return _lock.apply(this, arguments);
          }

          return lock;
        }()
      }, {
        key: "unlock",
        value: function unlock(node) {
          node.unlockPool.forEach(function (a) {
            return a();
          });
          node.unlockPool = [];
          node.busy = false;
        }
      }, {
        key: "extractInputData",
        value: function () {
          var _extractInputData = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(node) {
            var _this3 = this;

            var obj, _i, _Object$keys, key, input, conns, connData;

            return _regeneratorRuntime().wrap(function _callee5$(_context5) {
              while (1) {
                switch (_context5.prev = _context5.next) {
                  case 0:
                    obj = {};
                    _i = 0, _Object$keys = Object.keys(node.inputs);

                  case 2:
                    if (!(_i < _Object$keys.length)) {
                      _context5.next = 13;
                      break;
                    }

                    key = _Object$keys[_i];
                    input = node.inputs[key];
                    conns = input.connections;
                    _context5.next = 8;
                    return Promise.all(conns.map( /*#__PURE__*/function () {
                      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(c) {
                        var prevNode, outputs;
                        return _regeneratorRuntime().wrap(function _callee4$(_context4) {
                          while (1) {
                            switch (_context4.prev = _context4.next) {
                              case 0:
                                prevNode = _this3.data.nodes[c.node];
                                _context4.next = 3;
                                return _this3.processNode(prevNode);

                              case 3:
                                outputs = _context4.sent;

                                if (outputs) {
                                  _context4.next = 8;
                                  break;
                                }

                                _this3.abort();

                                _context4.next = 9;
                                break;

                              case 8:
                                return _context4.abrupt("return", outputs[c.output]);

                              case 9:
                              case "end":
                                return _context4.stop();
                            }
                          }
                        }, _callee4);
                      }));

                      return function (_x4) {
                        return _ref.apply(this, arguments);
                      };
                    }()));

                  case 8:
                    connData = _context5.sent;
                    obj[key] = connData;

                  case 10:
                    _i++;
                    _context5.next = 2;
                    break;

                  case 13:
                    return _context5.abrupt("return", obj);

                  case 14:
                  case "end":
                    return _context5.stop();
                }
              }
            }, _callee5);
          }));

          function extractInputData(_x3) {
            return _extractInputData.apply(this, arguments);
          }

          return extractInputData;
        }()
      }, {
        key: "processWorker",
        value: function () {
          var _processWorker = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(node) {
            var inputData, component, outputData;
            return _regeneratorRuntime().wrap(function _callee6$(_context6) {
              while (1) {
                switch (_context6.prev = _context6.next) {
                  case 0:
                    _context6.next = 2;
                    return this.extractInputData(node);

                  case 2:
                    inputData = _context6.sent;
                    component = this.components.get(node.name);
                    outputData = {};
                    _context6.prev = 5;
                    _context6.next = 8;
                    return component.worker.apply(component, [node, inputData, outputData].concat(_toConsumableArray$1(this.args)));

                  case 8:
                    _context6.next = 14;
                    break;

                  case 10:
                    _context6.prev = 10;
                    _context6.t0 = _context6["catch"](5);
                    this.abort();
                    this.trigger('warn', _context6.t0);

                  case 14:
                    return _context6.abrupt("return", outputData);

                  case 15:
                  case "end":
                    return _context6.stop();
                }
              }
            }, _callee6, this, [[5, 10]]);
          }));

          function processWorker(_x5) {
            return _processWorker.apply(this, arguments);
          }

          return processWorker;
        }()
      }, {
        key: "processNode",
        value: function () {
          var _processNode = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(node) {
            return _regeneratorRuntime().wrap(function _callee7$(_context7) {
              while (1) {
                switch (_context7.prev = _context7.next) {
                  case 0:
                    if (!(this.state === State.ABORT || !node)) {
                      _context7.next = 2;
                      break;
                    }

                    return _context7.abrupt("return", null);

                  case 2:
                    _context7.next = 4;
                    return this.lock(node);

                  case 4:
                    if (node.outputData) {
                      _context7.next = 8;
                      break;
                    }

                    _context7.next = 7;
                    return this.processWorker(node);

                  case 7:
                    node.outputData = _context7.sent;

                  case 8:
                    this.unlock(node);
                    return _context7.abrupt("return", node.outputData);

                  case 10:
                  case "end":
                    return _context7.stop();
                }
              }
            }, _callee7, this);
          }));

          function processNode(_x6) {
            return _processNode.apply(this, arguments);
          }

          return processNode;
        }()
      }, {
        key: "forwardProcess",
        value: function () {
          var _forwardProcess = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10(node) {
            var _this4 = this;

            return _regeneratorRuntime().wrap(function _callee10$(_context10) {
              while (1) {
                switch (_context10.prev = _context10.next) {
                  case 0:
                    if (!(this.state === State.ABORT)) {
                      _context10.next = 2;
                      break;
                    }

                    return _context10.abrupt("return", null);

                  case 2:
                    _context10.next = 4;
                    return Promise.all(Object.keys(node.outputs).map( /*#__PURE__*/function () {
                      var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9(key) {
                        var output;
                        return _regeneratorRuntime().wrap(function _callee9$(_context9) {
                          while (1) {
                            switch (_context9.prev = _context9.next) {
                              case 0:
                                output = node.outputs[key];
                                _context9.next = 3;
                                return Promise.all(output.connections.map( /*#__PURE__*/function () {
                                  var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(c) {
                                    var nextNode;
                                    return _regeneratorRuntime().wrap(function _callee8$(_context8) {
                                      while (1) {
                                        switch (_context8.prev = _context8.next) {
                                          case 0:
                                            nextNode = _this4.data.nodes[c.node];

                                            if (_this4.forwarded.has(nextNode)) {
                                              _context8.next = 7;
                                              break;
                                            }

                                            _this4.forwarded.add(nextNode);

                                            _context8.next = 5;
                                            return _this4.processNode(nextNode);

                                          case 5:
                                            _context8.next = 7;
                                            return _this4.forwardProcess(nextNode);

                                          case 7:
                                          case "end":
                                            return _context8.stop();
                                        }
                                      }
                                    }, _callee8);
                                  }));

                                  return function (_x9) {
                                    return _ref3.apply(this, arguments);
                                  };
                                }()));

                              case 3:
                                return _context9.abrupt("return", _context9.sent);

                              case 4:
                              case "end":
                                return _context9.stop();
                            }
                          }
                        }, _callee9);
                      }));

                      return function (_x8) {
                        return _ref2.apply(this, arguments);
                      };
                    }()));

                  case 4:
                    return _context10.abrupt("return", _context10.sent);

                  case 5:
                  case "end":
                    return _context10.stop();
                }
              }
            }, _callee10, this);
          }));

          function forwardProcess(_x7) {
            return _forwardProcess.apply(this, arguments);
          }

          return forwardProcess;
        }()
      }, {
        key: "copy",
        value: function copy(data) {
          data = Object.assign({}, data);
          data.nodes = Object.assign({}, data.nodes);
          Object.keys(data.nodes).forEach(function (key) {
            data.nodes[key] = Object.assign({}, data.nodes[key]);
          });
          return data;
        }
      }, {
        key: "validate",
        value: function () {
          var _validate = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(data) {
            var checking, recursion, recurrentNode;
            return _regeneratorRuntime().wrap(function _callee11$(_context11) {
              while (1) {
                switch (_context11.prev = _context11.next) {
                  case 0:
                    checking = Validator.validate(this.id, data);
                    recursion = new Recursion(data.nodes);

                    if (checking.success) {
                      _context11.next = 6;
                      break;
                    }

                    _context11.next = 5;
                    return this.throwError(checking.msg);

                  case 5:
                    return _context11.abrupt("return", _context11.sent);

                  case 6:
                    recurrentNode = recursion.detect();

                    if (!recurrentNode) {
                      _context11.next = 11;
                      break;
                    }

                    _context11.next = 10;
                    return this.throwError('Recursion detected', recurrentNode);

                  case 10:
                    return _context11.abrupt("return", _context11.sent);

                  case 11:
                    return _context11.abrupt("return", true);

                  case 12:
                  case "end":
                    return _context11.stop();
                }
              }
            }, _callee11, this);
          }));

          function validate(_x10) {
            return _validate.apply(this, arguments);
          }

          return validate;
        }()
      }, {
        key: "processStartNode",
        value: function () {
          var _processStartNode = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12(id) {
            var startNode;
            return _regeneratorRuntime().wrap(function _callee12$(_context12) {
              while (1) {
                switch (_context12.prev = _context12.next) {
                  case 0:
                    if (id) {
                      _context12.next = 2;
                      break;
                    }

                    return _context12.abrupt("return");

                  case 2:
                    startNode = this.data.nodes[id];

                    if (startNode) {
                      _context12.next = 7;
                      break;
                    }

                    _context12.next = 6;
                    return this.throwError('Node with such id not found');

                  case 6:
                    return _context12.abrupt("return", _context12.sent);

                  case 7:
                    _context12.next = 9;
                    return this.processNode(startNode);

                  case 9:
                    _context12.next = 11;
                    return this.forwardProcess(startNode);

                  case 11:
                  case "end":
                    return _context12.stop();
                }
              }
            }, _callee12, this);
          }));

          function processStartNode(_x11) {
            return _processStartNode.apply(this, arguments);
          }

          return processStartNode;
        }()
      }, {
        key: "processUnreachable",
        value: function () {
          var _processUnreachable = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee13() {
            var data, i, node;
            return _regeneratorRuntime().wrap(function _callee13$(_context13) {
              while (1) {
                switch (_context13.prev = _context13.next) {
                  case 0:
                    data = this.data;
                    _context13.t0 = _regeneratorRuntime().keys(data.nodes);

                  case 2:
                    if ((_context13.t1 = _context13.t0()).done) {
                      _context13.next = 12;
                      break;
                    }

                    i = _context13.t1.value;
                    // process nodes that have not been reached
                    node = data.nodes[i];

                    if (!(typeof node.outputData === 'undefined')) {
                      _context13.next = 10;
                      break;
                    }

                    _context13.next = 8;
                    return this.processNode(node);

                  case 8:
                    _context13.next = 10;
                    return this.forwardProcess(node);

                  case 10:
                    _context13.next = 2;
                    break;

                  case 12:
                  case "end":
                    return _context13.stop();
                }
              }
            }, _callee13, this);
          }));

          function processUnreachable() {
            return _processUnreachable.apply(this, arguments);
          }

          return processUnreachable;
        }()
      }, {
        key: "process",
        value: function () {
          var _process = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee14(data) {
            var startId,
                _len,
                args,
                _key,
                _args14 = arguments;

            return _regeneratorRuntime().wrap(function _callee14$(_context14) {
              while (1) {
                switch (_context14.prev = _context14.next) {
                  case 0:
                    startId = _args14.length > 1 && _args14[1] !== undefined ? _args14[1] : null;

                    if (this.processStart()) {
                      _context14.next = 3;
                      break;
                    }

                    return _context14.abrupt("return");

                  case 3:
                    if (this.validate(data)) {
                      _context14.next = 5;
                      break;
                    }

                    return _context14.abrupt("return");

                  case 5:
                    this.data = this.copy(data);

                    for (_len = _args14.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
                      args[_key - 2] = _args14[_key];
                    }

                    this.args = args;
                    this.forwarded = new Set();
                    _context14.next = 11;
                    return this.processStartNode(startId);

                  case 11:
                    _context14.next = 13;
                    return this.processUnreachable();

                  case 13:
                    return _context14.abrupt("return", this.processDone() ? 'success' : 'aborted');

                  case 14:
                  case "end":
                    return _context14.stop();
                }
              }
            }, _callee14, this);
          }));

          function process(_x12) {
            return _process.apply(this, arguments);
          }

          return process;
        }()
      }]);

      return Engine;
    }(Context);

    var index$2 = {
      Engine: Engine,
      Recursion: Recursion,
      Component: Component,
      Control: Control,
      Connection: Connection,
      Emitter: Emitter,
      Input: Input,
      IO: IO,
      Node: Node,
      NodeEditor: NodeEditor$1,
      Output: Output,
      Socket: Socket
    };

    /*!
    * rete-connection-plugin v0.9.0 
    * (c) 2019 Vitaliy Stoliarov 
    * Released under the MIT license.
    */
    function ___$insertStyle$1(css) {
      if (!css) {
        return;
      }
      if (typeof window === 'undefined') {
        return;
      }

      var style = document.createElement('style');

      style.setAttribute('type', 'text/css');
      style.innerHTML = css;
      document.head.appendChild(style);

      return css;
    }

    function _classCallCheck$1(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _defineProperties$1(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass$1(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties$1(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties$1(Constructor, staticProps);
      return Constructor;
    }

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function _slicedToArray$1(arr, i) {
      return _arrayWithHoles$1(arr) || _iterableToArrayLimit$1(arr, i) || _nonIterableRest$1();
    }

    function _arrayWithHoles$1(arr) {
      if (Array.isArray(arr)) return arr;
    }

    function _iterableToArrayLimit$1(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    function _nonIterableRest$1() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }

    function toTrainCase(str) {
      return str.toLowerCase().replace(/ /g, '-');
    }

    function getMapItemRecursively(map, el) {
      return map.get(el) || (el.parentElement ? getMapItemRecursively(map, el.parentElement) : null);
    }
    function defaultPath(points, curvature) {
      var _points = _slicedToArray$1(points, 4),
          x1 = _points[0],
          y1 = _points[1],
          x2 = _points[2],
          y2 = _points[3];

      var hx1 = x1 + Math.abs(x2 - x1) * curvature;
      var hx2 = x2 - Math.abs(x2 - x1) * curvature;
      return "M ".concat(x1, " ").concat(y1, " C ").concat(hx1, " ").concat(y1, " ").concat(hx2, " ").concat(y2, " ").concat(x2, " ").concat(y2);
    }
    function renderPathData(emitter, points, connection) {
      var data = {
        points: points,
        connection: connection,
        d: ''
      };
      emitter.trigger('connectionpath', data);
      return data.d || defaultPath(points, 0.4);
    }
    function updateConnection(_ref) {
      var el = _ref.el,
          d = _ref.d;
      var path = el.querySelector('.connection path');
      if (!path) throw new Error('Path of connection was broken');
      path.setAttribute('d', d);
    }
    function renderConnection(_ref2) {
      var _svg$classList;

      var el = _ref2.el,
          d = _ref2.d,
          connection = _ref2.connection;
      var classed = !connection ? [] : ['input-' + toTrainCase(connection.input.name), 'output-' + toTrainCase(connection.output.name), 'socket-input-' + toTrainCase(connection.input.socket.name), 'socket-output-' + toTrainCase(connection.output.socket.name)];
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      (_svg$classList = svg.classList).add.apply(_svg$classList, ['connection'].concat(classed));

      path.classList.add('main-path');
      path.setAttribute('d', d);
      svg.appendChild(path);
      el.appendChild(svg);
      updateConnection({
        el: el,
        d: d
      });
    }

    var PickerView =
    /*#__PURE__*/
    function () {
      function PickerView(emitter, editorView) {
        _classCallCheck$1(this, PickerView);

        this.emitter = emitter;
        this.editorView = editorView;

        _defineProperty(this, "el", void 0);

        this.el = document.createElement('div');
        this.el.style.position = 'absolute';
        this.editorView.area.appendChild(this.el);
      }

      _createClass$1(PickerView, [{
        key: "updatePseudoConnection",
        value: function updatePseudoConnection(io) {
          if (io !== null) {
            this.renderConnection(io);
          } else if (this.el.parentElement) {
            this.el.innerHTML = '';
          }
        }
      }, {
        key: "getPoints",
        value: function getPoints(io) {
          var mouse = this.editorView.area.mouse;
          if (!io.node) throw new Error('Node in output/input not found');
          var node = this.editorView.nodes.get(io.node);
          if (!node) throw new Error('Node view not found');

          var _node$getSocketPositi = node.getSocketPosition(io),
              _node$getSocketPositi2 = _slicedToArray$1(_node$getSocketPositi, 2),
              x1 = _node$getSocketPositi2[0],
              y1 = _node$getSocketPositi2[1];

          return io instanceof Output ? [x1, y1, mouse.x, mouse.y] : [mouse.x, mouse.y, x1, y1];
        }
      }, {
        key: "updateConnection",
        value: function updateConnection$1(io) {
          var d = renderPathData(this.emitter, this.getPoints(io));

          updateConnection({
            el: this.el,
            d: d
          });
        }
      }, {
        key: "renderConnection",
        value: function renderConnection$1(io) {
          var d = renderPathData(this.emitter, this.getPoints(io));

          renderConnection({
            el: this.el,
            d: d
          });
        }
      }]);

      return PickerView;
    }();

    var Picker =
    /*#__PURE__*/
    function () {
      function Picker(editor) {
        var _this = this;

        _classCallCheck$1(this, Picker);

        _defineProperty(this, "editor", void 0);

        _defineProperty(this, "_io", null);

        _defineProperty(this, "view", void 0);

        this.editor = editor;
        this.view = new PickerView(editor, editor.view);
        editor.on('mousemove', function () {
          return _this.io && _this.view.updateConnection(_this.io);
        });
      }

      _createClass$1(Picker, [{
        key: "reset",
        value: function reset() {
          this.io = null;
        }
      }, {
        key: "pickOutput",
        value: function pickOutput(output) {
          if (!this.editor.trigger('connectionpick', output)) return;

          if (this.io instanceof Input) {
            if (!output.multipleConnections && output.hasConnection()) this.editor.removeConnection(output.connections[0]);
            this.editor.connect(output, this.io);
            this.reset();
            return;
          }

          if (this.io) this.reset();
          this.io = output;
        }
      }, {
        key: "pickInput",
        value: function pickInput(input) {
          var _this2 = this;

          if (!this.editor.trigger('connectionpick', input)) return;

          if (this.io === null) {
            if (input.hasConnection()) {
              this.io = input.connections[0].output;
              this.editor.removeConnection(input.connections[0]);
            } else {
              this.io = input;
            }

            return true;
          }

          if (!input.multipleConnections && input.hasConnection()) this.editor.removeConnection(input.connections[0]);
          if (!this.io.multipleConnections && this.io.hasConnection()) this.editor.removeConnection(this.io.connections[0]);

          if (this.io instanceof Output && this.io.connectedTo(input)) {
            var connection = input.connections.find(function (c) {
              return c.output === _this2.io;
            });

            if (connection) {
              this.editor.removeConnection(connection);
            }
          }

          if (this.io instanceof Output) {
            this.editor.connect(this.io, input);
            this.reset();
          }
        }
      }, {
        key: "pickConnection",
        value: function pickConnection(connection) {
          var output = connection.output;
          this.editor.removeConnection(connection);
          this.io = output;
        }
      }, {
        key: "io",
        get: function get() {
          return this._io;
        },
        set: function set(io) {
          this._io = io;
          this.view.updatePseudoConnection(io);
        }
      }]);

      return Picker;
    }();

    var Flow =
    /*#__PURE__*/
    function () {
      function Flow(picker) {
        _classCallCheck$1(this, Flow);

        _defineProperty(this, "picker", void 0);

        _defineProperty(this, "target", void 0);

        this.picker = picker;
        this.target = null;
      }

      _createClass$1(Flow, [{
        key: "act",
        value: function act(_ref) {
          var input = _ref.input,
              output = _ref.output;
          if (this.unlock(input || output)) return;
          if (input) this.picker.pickInput(input);else if (output) this.picker.pickOutput(output);else this.picker.reset();
        }
      }, {
        key: "start",
        value: function start(params, io) {
          this.act(params);
          this.target = io;
        }
      }, {
        key: "complete",
        value: function complete() {
          var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          this.act(params);
        }
      }, {
        key: "hasTarget",
        value: function hasTarget() {
          return Boolean(this.target);
        }
      }, {
        key: "unlock",
        value: function unlock(io) {
          var target = this.target;
          this.target = null;
          return target && target === io;
        }
      }]);

      return Flow;
    }();

    ___$insertStyle$1(".connection {\n  overflow: visible !important;\n  position: absolute;\n  z-index: -1;\n  pointer-events: none; }\n  .connection > * {\n    pointer-events: all; }\n  .connection .main-path {\n    fill: none;\n    stroke-width: 5px;\n    stroke: steelblue; }\n");

    function install$1(editor) {
      editor.bind('connectionpath');
      editor.bind('connectiondrop');
      editor.bind('connectionpick');
      editor.bind('resetconnection');
      var picker = new Picker(editor);
      var flow = new Flow(picker);
      var socketsParams = new WeakMap();

      function pointerDown(e) {
        var flowParams = socketsParams.get(this);

        if (flowParams) {
          var input = flowParams.input,
              output = flowParams.output;
          editor.view.container.dispatchEvent(new PointerEvent('pointermove', e));
          e.preventDefault();
          e.stopPropagation();
          flow.start({
            input: input,
            output: output
          }, input || output);
        }
      }

      function pointerUp(e) {
        var flowEl = document.elementFromPoint(e.clientX, e.clientY);

        if (picker.io) {
          editor.trigger('connectiondrop', picker.io);
        }

        if (flowEl) {
          flow.complete(getMapItemRecursively(socketsParams, flowEl) || {});
        }
      }

      editor.on('resetconnection', function () {
        return flow.complete();
      });
      editor.on('rendersocket', function (_ref) {
        var el = _ref.el,
            input = _ref.input,
            output = _ref.output;
        socketsParams.set(el, {
          input: input,
          output: output
        });
        el.removeEventListener('pointerdown', pointerDown);
        el.addEventListener('pointerdown', pointerDown);
      });
      window.addEventListener('pointerup', pointerUp);
      editor.on('renderconnection', function (_ref2) {
        var el = _ref2.el,
            connection = _ref2.connection,
            points = _ref2.points;
        var d = renderPathData(editor, points, connection);
        renderConnection({
          el: el,
          d: d,
          connection: connection
        });
      });
      editor.on('updateconnection', function (_ref3) {
        var el = _ref3.el,
            connection = _ref3.connection,
            points = _ref3.points;
        var d = renderPathData(editor, points, connection);
        updateConnection({
          el: el,
          d: d
        });
      });
      editor.on('destroy', function () {
        window.removeEventListener('pointerup', pointerUp);
      });
    }

    var index$1 = {
      name: 'connection',
      install: install$1
    };

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var alightRenderPlugin_min = {exports: {}};

    var alight = {exports: {}};

    /**
     * Angular Light 0.14.1
     * (c) 2016 Oleg Nechaev
     * Released under the MIT License.
     * 2017-11-30, http://angularlight.org/ 
     */

    var hasRequiredAlight;

    function requireAlight () {
    	if (hasRequiredAlight) return alight.exports;
    	hasRequiredAlight = 1;
    	(function (module) {
    		!function(){function e(){function e(e,t){var n,r=[],o=!1,a=t.cd,l=t.callback;if(t.filterConf.args.length){var c=[];t.filterConf.args.forEach(function(e,t){var n=a.watch(e,function(e){r[t+1]=e,u();});n.$.isStatic||c.push(n);});var s=!1,u=function(){s||(s=!0,a.watch("$onScanOnce",function(){if(s=!1,o){var t=e.apply(null,r);i.isPromise(t)?t.then(function(e){l(e),a.scan();}):l(t);}}));};c.length&&(n=function(){c.forEach(function(e){return e.stop()});});}else var u=function(){var t=e(r[0]);i.isPromise(t)?t.then(function(e){l(e),a.scan();}):l(t);};var f={onChange:function(e){o=!0,r[0]=e,u();},onStop:n,watchMode:t.watchMode};return f}function t(e,t,n,i){var o=null,a=i.oneTime;if(i.isArray?o="array":i.deep&&(o="deep"),!n){var l={el:i.element,ea:i.elementAttr};n=function(t){f(e.scope,l,t);};}for(var c=r.utils.parsFilter(t.filter),s=[],u=c.result.length-1;u>=0;u--){var p=r.core.getFilter(c.result[u].name,e),h=r.core.buildFilterNode(e,c.result[u],p,n);h.watchMode&&(o=h.watchMode),h.onStop&&s.push(h.onStop),n=h.onChange;}return i={oneTime:a},"array"===o?i.isArray=!0:"deep"===o&&(i.deep=!0),s.length&&(i.onStop=function(){s.forEach(function(e){return e()}),s.length=0;}),e.watch(t.expression,n,i)}function n(e,t,n,r){r.setValue(r.attrArgument,t);}var r=function(e,t){return r.bootstrap(e,t)};r.version="0.14.1",r.filters={},r.text={},r.core={},r.utils={},r.option={globalController:!1,removeAttribute:!0,domOptimization:!0,domOptimizationRemoveEmpty:!0,fastBinding:!0},r.debug={scan:0,directive:!1,watch:!1,watchText:!1,parser:!1},r.ctrl=r.controllers={},r.d=r.directives={al:{},bo:{},$global:{}},r.hooks={directive:[],binding:[]},r.priority={al:{app:2e3,checked:20,"class":30,css:30,focused:20,"if":700,ifnot:700,model:25,radio:25,repeat:1e3,select:20,stop:-10,value:20,on:10},$component:5,$attribute:-5};var i=r.f$={},o=function(e,t){var n=e.indexOf(t);n>=0?e.splice(n,1):console.warn("trying to remove not exist item");};!function(){i.before=function(e,t){var n=e.parentNode;n.insertBefore(t,e);},i.after=function(e,t){var n=e.parentNode,r=e.nextSibling;r?n.insertBefore(t,r):n.appendChild(t);},i.remove=function(e){var t=e.parentNode;t&&t.removeChild(e);},i.on=function(e,t,n){e.addEventListener(t,n,!1);},i.off=function(e,t,n){e.removeEventListener(t,n,!1);},i.isFunction=function(e){return e&&"[object Function]"===Object.prototype.toString.call(e)},i.isObject=function(e){return e&&"[object Object]"===Object.prototype.toString.call(e)},i.isPromise=function(e){return e&&window.Promise&&e instanceof window.Promise},i.isElement=function(e){return e instanceof HTMLElement},i.addClass=function(e,t){e.classList?e.classList.add(t):e.className+=" "+t;},i.removeClass=function(e,t){e.classList?e.classList.remove(t):e.className=e.className.replace(new RegExp("(^| )"+t.split(" ").join("|")+"( |$)","gi")," ");},i.rawAjax=function(e){var t=new XMLHttpRequest;t.open(e.type||"GET",e.url,!0,e.username,e.password);for(var n in e.headers)t.setRequestHeader(n,e.headers[n]);e.success&&(t.onload=function(){t.status>=200&&t.status<400?e.success(t.responseText):e.error&&e.error();}),e.error&&(t.onerror=e.error),t.send(e.data||null);},i.ajaxCache={},i.ajax=function(e){if(e.username||e.password||e.headers||e.data||!e.cache)return i.rawAjax(e);var t=e.type||"GET",n=t+":"+e.url,r=i.ajaxCache[n];return r||(i.ajaxCache[n]=r={callback:[]}),r.result?void(e.success&&e.success(r.result)):(r.callback.push(e),void(r.loading||(r.loading=!0,i.rawAjax({type:t,url:e.url,success:function(e){r.loading=!1,r.result=e;for(var t=0;t<r.callback.length;t++)r.callback[t].success&&r.callback[t].success(e);r.callback.length=0;},error:function(){r.loading=!1;for(var e=0;e<r.callback.length;e++)r.callback[e].error&&r.callback[e].error();r.callback.length=0;}}))))},function(){var e='@charset "UTF-8";[al-cloak],[hidden],.al-hide{display:none !important;}',t=document.querySelectorAll("head")[0],n=document.createElement("style");n.setAttribute("type","text/css"),n.styleSheet?n.styleSheet.cssText=e:n.appendChild(document.createTextNode(e)),t.appendChild(n);}();}(),i.ready=function(){function e(){n=!0,i.off(document,"DOMContentLoaded",e);for(var r=0;r<t.length;r++)t[r]();t.length=0;}var t=[],n=!1;return i.on(document,"DOMContentLoaded",e),function(e){n?e():t.push(e);}}(),window.jQuery&&(window.jQuery.fn.alight=function(e){var t=[];return this.each(function(e,n){return t.push(n)}),t.length?r(t,e):void 0}),r.core.getFilter=function(e,t){var n=t.locals[e];if(n&&(i.isFunction(n)||n.init||n.fn))return n;if(n=r.filters[e])return n;throw "Filter not found: "+e},r.core.buildFilterNode=function(t,n,r,o){if(i.isFunction(r))return e(r,{cd:t,filterConf:n,callback:o});if(r.init)return r.init.call(t,t.scope,n.raw,{setValue:o,conf:n,changeDetector:t});if(i.isFunction(r.fn))return e(r.fn,{cd:t,filterConf:n,callback:o,watchMode:r.watchMode});throw "Wrong filter: "+n.name};var a,l,c,s,u,f,p,h,d,m,v,g;r.ChangeDetector=function(e){var t,n;return n=new c,t=new a(n,e||{}),n.topCD=t,t},c=function(){return this.watchers={any:[],finishBinding:[],finishScan:[],finishScanOnce:[],onScanOnce:[]},this.status=null,this.extraLoop=!1,this.finishBinding_lock=!1,this.lateScan=!1,this.topCD=null,this},c.prototype.destroy=function(){return this.watchers.any.length=0,this.watchers.finishBinding.length=0,this.watchers.finishScan.length=0,this.watchers.finishScanOnce.length=0,this.watchers.onScanOnce.length=0,this.topCD?this.topCD.destroy():void 0},a=function(e,t){this.scope=t,this.locals=t,this.root=e,this.watchList=[],this.destroy_callbacks=[],this.parent=null,this.children=[],this.rwatchers={any:[],finishScan:[],elEvents:[]};},a.prototype["new"]=function(e,t){var n,r,i;return t=t||{},i=this,null==e&&(e=i.scope),r=new a(i.root,e),r.parent=i,e===i.scope&&(t.locals?(n=i._ChildLocals,n||(i._ChildLocals=n=function(){return this.$$root=e,this},n.prototype=i.locals),r.locals=new n):r.locals=i.locals),i.children.push(r),r},a.prototype.destroy=function(){var e,t,n,a,l,c,s,u,f,p,h,d,m,v,g,y,b,w,x,k,D,$,C,A;for(e=this,C=e.root,e.scope=null,e.parent&&o(e.parent.children,e),b=e.destroy_callbacks,l=0,u=b.length;u>l;l++)(b[l])();for(w=e.children.slice(),c=0,f=w.length;f>c;c++)t=w[c],t.destroy();for(e.destroy_callbacks.length=0,x=e.watchList,s=0,p=x.length;p>s;s++)n=x[s],n.onStop&&n.onStop();for(e.watchList.length=0,k=e.rwatchers.any,v=0,h=k.length;h>v;v++)A=k[v],o(C.watchers.any,A);for(e.rwatchers.any.length=0,D=e.rwatchers.finishScan,g=0,d=D.length;d>g;g++)A=D[g],o(C.watchers.finishScan,A);for(e.rwatchers.finishScan.length=0,$=this.rwatchers.elEvents,y=0,m=$.length;m>y;y++)a=$[y],i.off(a[0],a[1],a[2]);this.rwatchers.elEvents.length=0,C.topCD===e&&(C.topCD=null,C.destroy());},s=function(e){return this.cb=e},v=function(e,t,n){var r,i;return r=e.root,i=new s(n),e.rwatchers[t].push(i),r.watchers[t].push(i),{stop:function(){return o(e.rwatchers[t],i),o(r.watchers[t],i)}}},a.prototype.on=function(e,t,n){return i.on(e,t,n),this.rwatchers.elEvents.push([e,t,n])},h={$any:function(e,t){return v(e,"any",t)},$finishScan:function(e,t){return v(e,"finishScan",t)},$finishScanOnce:function(e,t){e.root.watchers.finishScanOnce.push(t);},$onScanOnce:function(e,t){e.root.watchers.onScanOnce.push(t);},$destroy:function(e,t){e.destroy_callbacks.push(t);},$finishBinding:function(e,t){e.root.watchers.finishBinding.push(t);}},g=function(){},a.prototype.watch=function(e,n,a){var l,c,s,u,p,d,m,v,y,w;if(p=h[e])return p(this,n);if(a=a||{},a===!0&&(a={isArray:!0}),a.init&&console.warn("watch.init is depricated"),l=this,l.root,w=l.scope,i.isFunction(e)?(u=e,v=r.utils.getId(),d=!0):(d=!1,u=null,e=e.trim(),"::"===e.slice(0,2)&&(e=e.slice(2),a.oneTime=!0),v=e,v=a.deep?"d#"+v:a.isArray?"a#"+v:"v#"+v),r.debug.watch&&console.log("$watch",e),m=!1,!d)if(a.watchText)u=a.watchText.fn;else {if(c=r.utils.compile.expression(e),c.filter)return t(l,c,n,a);m=c.isSimple&&0===c.simpleVariables.length,u=c.fn;}return a.deep&&(a.isArray=!1),s={isStatic:m,isArray:Boolean(a.isArray),extraLoop:!a.readOnly,deep:a.deep===!0?10:a.deep,value:g,callback:n,exp:u,src:""+e,onStop:a.onStop||null,el:a.element||null,ea:a.elementAttr||null},m?l.watch("$onScanOnce",function(){return f(w,s,s.exp(w))}):l.watchList.push(s),y={$:s,stop:function(){var t;if(a.onStop)try{a.onStop();}catch(n){t=n,r.exceptionHandler(t,"Error in onStop of watcher: "+e,e);}if(!s.isStatic)return o(l.watchList,s)},refresh:function(){var e;return e=s.exp(l.locals),s.value=e&&s.deep?r.utils.clone(e,s.deep):e&&s.isArray?e.slice():e}},a.oneTime&&(s.callback=function(e){return void 0!==e?(y.stop(),n(e)):void 0}),y},a.prototype.watchGroup=function(e,t){var n,r,o,a,l,c;if(n=this,!t&&i.isFunction(e)&&(t=e,e=null),c=!1,r=function(){return c?void 0:(c=!0,n.watch("$onScanOnce",function(){return c=!1,t()}))},e)for(o=0,l=e.length;l>o;o++)a=e[o],n.watch(a,r);return r},p=function(){return window.performance?function(){return Math.floor(performance.now())}:function(){return (new Date).getTime()}}(),d=function(e,t){var n,r,i,o,a,l;if(null===e||null===t)return !0;if(o=typeof e,a=typeof t,o!==a)return !0;if("object"===o){if(e.length!==t.length)return !0;for(n=r=0,i=e.length;i>r;n=++r)if(l=e[n],l!==t[n])return !0}return !1},f=function(e,t,n){t.el?t.ea?t.el.setAttribute(t.ea,n):t.el.nodeValue=n:t.callback.call(e,n);},u=function(e,t,n,i){var o,a;return o={src:n.src,scope:t.scope,locals:t.locals},n.el&&(o.element=n.el),a=1===i?"$scan, error in callback: ":"$scan, error in expression: ",r.exceptionHandler(e,a+n.src,o)},l=function(){},m=function(e,t){var n,i,o,a,c,p,h,m,v,y,b,w,x,k,$,C,A;if(e.root,p=!1,a=0,$=0,e){for(x=[],h=0,o=e;o;){for(b=o.locals,$+=o.watchList.length,k=o.watchList.slice(),m=0,y=k.length;y>m;m++){A=k[m],v=A.value;try{C=A.exp(b);}catch(s){c=s,C=l;}if(v!==C){if(w=!1,A.isArray?(n=Array.isArray(v),i=Array.isArray(C),n===i?n?d(v,C)&&(w=!0,A.value=C.slice()):(w=!0,A.value=C):(w=!0,A.value=i?C.slice():C)):A.deep?r.utils.equal(v,C,A.deep)||(w=!0,A.value=r.utils.clone(C,A.deep)):(w=!0,A.value=C),w)if(w=!1,C===l)u(c,o,A);else {a++;try{A.el?A.ea?null!=C?A.el.setAttribute(A.ea,C):A.el.removeAttribute(A.ea):A.el.nodeValue=C:(v===g&&(v=void 0),"$scanNoChanges"!==A.callback.call(o.scope,C,v)&&A.extraLoop&&(p=!0));}catch(f){c=f,u(c,o,A,1);}}r.debug.scan>1&&console.log("changed:",A.src);}}x.push.apply(x,o.children),o=x[h++];}t.total=$,t.changes=a,t.extraLoop=p;}},a.prototype.digest=function(){var e,t,n,i,o,a,l,c,s,u;for(c=this.root,o=10,u=0,r.debug.scan&&(s=p()),l={total:0,changes:0,extraLoop:!1,src:"",scope:null,element:null};o;){if(o--,c.extraLoop=!1,c.watchers.onScanOnce.length)for(a=c.watchers.onScanOnce.slice(),c.watchers.onScanOnce.length=0,n=0,i=a.length;i>n;n++)e=a[n],e.call(c);if(m(this,l),u+=l.changes,!l.extraLoop&&!c.extraLoop&&!c.watchers.onScanOnce.length)break}return r.debug.scan&&(t=p()-s,console.log("$scan: loops: ("+(10-o)+"), last-loop changes: "+l.changes+", watches: "+l.total+" / "+t+"ms")),l.mainLoop=o,l.totalChanges=u,l},a.prototype.scan=function(e){var t,o,a,l,c,s,u,f,p,h,d,m;if(m=this.root,e=e||{},!r.option.zone||e.zone){if(i.isFunction(e)&&(e={callback:e}),e.callback&&m.watchers.finishScanOnce.push(e.callback),e.late){if(m.lateScan)return;return m.lateScan=!0,void r.nextTick(function(){return m.lateScan?m.topCD.scan():void 0})}if("scaning"===m.status)return void(m.extraLoop=!0);if(m.lateScan=!1,m.status="scaning",d=m.topCD?m.topCD.digest():{},d.totalChanges)for(p=m.watchers.any,a=0,s=p.length;s>a;a++)(p[a])();for(m.status=null,h=m.watchers.finishScan,l=0,u=h.length;u>l;l++)(t=h[l])();for(o=m.watchers.finishScanOnce.slice(),m.watchers.finishScanOnce.length=0,c=0,f=o.length;f>c;c++)t=o[c],t.call(m);if(0===d.mainLoop)throw "Infinity loop detected";return d}},r.core.ChangeDetector=a,a.prototype.compile=function(e,t){return r.utils.compile.expression(e,t).fn},a.prototype.setValue=function(e,t){var n,i,a,l,c,s,u,f,p,h;n=this,a=n.compile(e+" = $value",{input:["$value"],no_return:!0});try{return a(n.locals,t)}catch(o){if(i=o,f="can't set variable: "+e,r.debug.parser&&console.warn(f),(""+i).indexOf("TypeError")>=0&&(h=e.match(/^([\w\d\.]+)\.[\w\d]+$/),h&&h[1])){for(u=n.locals,p=h[1].split("."),l=0,s=p.length;s>l;l++)c=p[l],void 0===u[c]&&(u[c]={}),u=u[c];try{return void a(n.locals,t)}catch(d){}}return r.exceptionHandler(i,f,{name:e,value:t})}},a.prototype.eval=function(e){return (this.compile(e))(this.locals)},a.prototype.getValue=function(e){return this.eval(e)},function(){var e;return r.text.$base=function(e){var t,n,i,o,a;if(o=e.point,t=e.cd,a=t.scope,n=a.$ns&&a.$ns.text?a.$ns.text[e.name]:r.text[e.name],!n)throw "No directive alight.text."+e.name;return i={changeDetector:t,setter:function(t){return e.update?(o.value=null===t?"":""+t,e.update()):void 0},setterRaw:function(t){return e.updateRaw?(o.value=null===t?"":""+t,e.updateRaw()):void 0},"finally":function(t){return e["finally"]?(o.value=null===t?"":""+t,o.type="text",e["finally"](),e.update=null,e["finally"]=null):void 0}},n.call(t,i.setter,e.exp,a,i)},e=function(e,t,n){var i,o,a,l,c,s,u,p,h,d,m,v,g,y,b,w,x,k,D,$,C,A,E,B,T,_,N,S,O;if(n=n||{},o=this,r.debug.watchText&&console.log("$watchText",e),B=r.utils.compile.buildSimpleText(e,null))return void o.watch(e,t,{watchText:B,element:n.element,elementAttr:n.elementAttr});for(c=r.utils.parsText(e),S=0,i=!0,C=!1,u=p=s=function(){},g=0,w=c.length;w>g;g++)if(l=c[g],"expression"===l.type)if(h=l.list.join("|"),D=h.match(/^([^\w\d\s\$"'\(\u0410-\u044F\u0401\u0451]+)/))l.isDir=!0,$=D[1],"#"===$?(v=h.indexOf(" "),0>v?($=h.substring(1),h=""):($=h.slice(1,v),h=h.slice(v))):h=h.substring($.length),r.text.$base({name:$,exp:h,cd:o,point:l,update:function(){return u()},updateRaw:function(){return p()},"finally":function(){return u(),s()}}),C=!0,"text"!==l.type&&(i=!1);else if(a=r.utils.compile.expression(h,{string:!0}),a.filter)S++,i=!1,l.watched=!0,function(e){return o.watch(h,function(t){return null==t&&(t=""),e.value=t,u()})}(l);else {if(l.fn=a.fn,!a.rawExpression)throw "Error";a.isSimple&&0===a.simpleVariables.length?(l.type="text",l.value=l.fn()):(l.re=a.rawExpression,S++);}if(i){if(!S){for(_="",y=0,x=c.length;x>y;y++)l=c[y],_+=l.value;return void o.watch("$onScanOnce",function(){return f(o.scope,{callback:t,el:n.element,ea:n.elementAttr},_)})}return B=C?r.utils.compile.buildSimpleText(null,c):r.utils.compile.buildSimpleText(e,c),void o.watch(e,t,{watchText:{fn:B.fn},element:n.element,elementAttr:n.elementAttr})}if(O={callback:t,el:n.element,ea:n.elementAttr},c.scope=o.scope,m=r.utils.compile.buildText(e,c),p=function(){return f(o.scope,O,m())},S){for(N=null,E="",u=function(){E=m();},s=function(){var e,t;for(v=!0,e=0,t=c.length;t>e;e++)if(l=c[e],"expression"===l.type){v=!1;break}v&&(o.watch("$finishScanOnce",function(){return N.stop()}),n.onStatic&&n.onStatic());},A=function(){return E},b=0,k=c.length;k>b;b++)if(l=c[b],"expression"===l.type){if(l.isDir||l.watched)continue;l.watched=!0,function(e,t){return o.watch(t,function(t){return null==t&&(t=""),e.value=t,u()})}(l,l.list.join(" | "));}u(),N=o.watch(A,t,{element:n.element,elementAttr:n.elementAttr});}else T=!1,d=function(){return T=!1,p()},(u=function(){return T?void 0:(T=!0,o.watch("$onScanOnce",d))})();},a.prototype.watchText=e}();var y;y={TR:1,TD:1,LI:1},r.utils.optmizeElement=function(e,t){var n,o,a,l,c,s,u,f,p,h,d,m,v,g,b,w,x,k,D,$;if(1===e.nodeType){for(t=t||!r.option.domOptimizationRemoveEmpty,"PRE"===e.nodeName&&(t=!0),l=e.firstChild,!l||3!==l.nodeType||l.nodeValue.trim()||t||(i.remove(l),l=e.firstChild),w=!1;l;)g=l.nextSibling,!w||3!==l.nodeType||l.nodeValue.trim()||t?(w=1===l.nodeType&&y[l.nodeName],r.utils.optmizeElement(l,t)):i.remove(l),l=g;l=e.lastChild,!l||3!==l.nodeType||l.nodeValue.trim()||t||i.remove(l);}else if(3===e.nodeType){if(D=e.data,m=r.utils.pars_start_tag,s=D.indexOf(m),0>s)return;if(D.slice(s+m.length).indexOf(m)<0)return;for(b="t",n={value:""},k=[n],a=r.utils.parsText(D),u=0,p=a.length;p>u;u++)o=a[u],"text"===o.type?n.value+=o.value:(c=o.list.join("|"),$=r.utils.pars_start_tag+c+r.utils.pars_finish_tag,d=c.match(/^([^\w\d\s\$"'\(\u0410-\u044F\u0401\u0451]+)/),d?("t"===b||"d"===b?n.value+=$:(n={value:$},k.push(n)),b="d"):1===o.list.length?("t"===b||"v"===b?n.value+=$:(n={value:$},k.push(n)),b="v"):"t"===b?n.value+=$:(n={value:$},k.push(n)));if(k.length<2)return;for(l=e,l.data=k[0].value,x=k.slice(1),f=0,h=x.length;h>f;f++)o=x[f],v=document.createTextNode(o.value),i.after(l,v),l=v;}};var b,w,x,k,D,$,C,A;!function(){var e;return r.hooks.attribute=e=[],e.push({code:"dataPrefix",fn:function(){"data-"===this.attrName.slice(0,5)&&(this.attrName=this.attrName.slice(5));}}),e.push({code:"colonNameSpace",fn:function(){var e,t;this.directive||this.name||(t=this.attrName.match(/^(\w+)[\-\:](.+)$/),t?(this.ns=t[1],e=t[2]):(this.ns="$global",e=this.attrName),t=e.match(/^([^\.]+)\.(.*)$/),t&&(e=t[1],this.attrArgument=t[2]),this.name=e.replace(/(-\w)/g,function(e){return e.substring(1).toUpperCase()}));}}),e.push({code:"getGlobalDirective",fn:function(){var e;if(!this.directive){if(e=r.d[this.ns],!e)return this.result="noNS",void(this.stop=!0);this.directive=e[this.name],this.directive||(this.result="$global"===this.ns?"noNS":"noDirective",this.stop=!0);}}}),e.push({code:"cloneDirective",fn:function(){var e,t,n,o,a,l;if(a=this.directive,o=this.ns,n=this.name,e={},i.isFunction(a))e.init=a;else {if(!i.isObject(a))throw "Wrong directive: "+o+"."+n;for(t in a)l=a[t],e[t]=l;}if(e.priority=a.priority||r.priority[o]&&r.priority[o][n]||0,e.restrict=a.restrict||"A",e.restrict.indexOf(this.attrType)<0)throw "Directive has wrong binding (attribute/element): "+n;this.directive=e;}}),e.push({code:"preprocessor",fn:function(){var e,t,n;n=this.ns,t=this.name,e=this.directive,e.$init=function(i,o,a,l){var c,s;return c=function(){var e,t,n,r,i;for(r=s.procLine,t=n=0,i=r.length;i>n;t=++n)if(e=r[t],e.fn.call(s),s.isDeferred){s.procLine=r.slice(t+1);break}return s.async=!0,null},s={element:o,value:a,cd:i,env:l,ns:n,name:t,doBinding:!1,directive:e,isDeferred:!1,procLine:r.hooks.directive,makeDeferred:function(){return s.isDeferred=!0,s.doBinding=!0,s.retStopBinding=!0,s.async=!1,function(){return s.isDeferred=!1,s.async?c():void 0}}},e.stopBinding&&(l.stopBinding=!0),c(),s.retStopBinding?"stopBinding":void 0};}})}(),function(){var e;return e=r.hooks.directive,e.push({code:"init",fn:function(){var e;this.directive.init&&(r.debug.directive&&this.directive.scope&&console.warn(this.ns+"-"+this.name+" uses scope and init together, probably you need use link instead of init"),this.env.changeDetector=this.cd,e=this.directive.init.call(this.env,this.cd.scope,this.element,this.value,this.env),e&&e.start&&e.start());}}),e.push({code:"templateUrl",fn:function(){var e,t;t=this,this.directive.templateUrl&&(e=this.makeDeferred(),i.ajax({cache:!0,url:this.directive.templateUrl,success:function(n){return t.directive.template=n,e()},error:e}));}}),e.push({code:"template",fn:function(){var e;this.directive.template&&(1===this.element.nodeType?this.element.innerHTML=this.directive.template:8===this.element.nodeType&&(e=document.createElement("p"),e.innerHTML=this.directive.template.trim(),e=e.firstChild,i.after(this.element,e),this.element=e,this.doBinding=!0));}}),e.push({code:"scope",fn:function(){var e,t;if(this.directive.scope){switch(t=this.cd,this.directive.scope){case!0:e=t["new"]({$parent:t.scope});break;case"root":e=r.ChangeDetector({$parent:t.scope}),t.watch("$destroy",function(){return e.destroy()});break;default:throw "Wrong scope value: "+this.directive.scope}this.env.parentChangeDetector=t,this.cd=e,this.doBinding=!0,this.retStopBinding=!0;}}}),e.push({code:"link",fn:function(){var e;this.directive.link&&(this.env.changeDetector=this.cd,e=this.directive.link.call(this.env,this.cd.scope,this.element,this.value,this.env),e&&e.start&&e.start());}}),e.push({code:"scopeBinding",fn:function(){this.doBinding&&!this.env.stopBinding&&r.bind(this.cd,this.element,{skip_attr:this.env.skippedAttr()});}})}(),A=function(){var e;return e=function(e,t,n){var i;"A"===t.attr_type?(i=n||{},i.priority=r.priority.$attribute,i.is_attr=!0,i.name=e,i.attrName=e,i.element=t.element,t.list.push(i)):"M"===t.attr_type&&t.list.push(n);},function(t,n){var i,o,a,l,c;if(n.skip_attr.indexOf(t)>=0)return e(t,n,{skip:!0});for(o={attrName:t,attrType:n.attr_type,element:n.element,cd:n.cd,result:null},c=r.hooks.attribute,a=0,l=c.length;l>a&&(i=c[a],i.fn.call(o),!o.stop);a++);return "noNS"===o.result?void e(t,n):"noDirective"===o.result?"E"===n.attr_type?void n.list.push({name:t,priority:-10,attrName:t,noDirective:!0}):void e(t,n,{noDirective:!0}):void n.list.push({name:t,directive:o.directive,priority:o.directive.priority,attrName:t,attrArgument:o.attrArgument})}}(),C=function(e,t){return e.priority===t.priority?0:e.priority>t.priority?-1:1},w=function(e,t,n,i){var o;return o=n,o.indexOf(r.utils.pars_start_tag)<0?void 0:(e.watchText(o,null,{element:t,elementAttr:i}),!0)},$=function(e,t){var n;return n=t.data,n.indexOf(r.utils.pars_start_tag)<0?void 0:(e.watchText(n,null,{element:t}),n)},x=function(e,t){var n,i,o,a,l,c,u,f,p,h;if(p=t.nodeValue.trim(),"directive:"===p.slice(0,10)){if(p=p.slice(10).trim(),u=p.indexOf(" "),u>=0?(o=p.slice(0,+(u-1)+1||9e9),h=p.slice(u+1)):(o=p,h=""),n={list:f=[],element:t,attr_type:"M",cd:e,skip_attr:[]},A(o,n),i=f[0],i.noDirective)throw "Comment directive not found: "+o;a=i.directive,c=new b({element:t,attrName:i.attrName,attrArgument:i.attrArgument||null,attributes:f}),r.debug.directive&&console.log("bind",i.attrName,h,i);try{a.$init(e,t,h,c);}catch(s){l=s,r.exceptionHandler(l,"Error in directive: "+i.name,{value:h,env:c,cd:e,scope:e.scope,element:t});}return c.skipToElement?{directive:1,skipToElement:c.skipToElement}:{directive:1,skipToElement:null}}},b=function(e){var t,n;for(t in e)n=e[t],this[t]=n;return this},b.prototype.takeAttr=function(e,t){var n,r,i,o,a;for(1===arguments.length&&(t=!0),o=this.attributes,r=0,i=o.length;i>r;r++)if(n=o[r],n.attrName===e)return t&&(n.skip=!0),a=this.element.getAttribute(e),a||!0},b.prototype.skippedAttr=function(){var e,t,n,r,i;for(r=this.attributes,i=[],t=0,n=r.length;n>t;t++)e=r[t],e.skip&&i.push(e.attrName);return i},b.prototype.scan=function(e){return this.changeDetector.scan(e)},b.prototype.on=function(e,t,n){return this.changeDetector.on(e,t,n)},b.prototype.watch=function(e,t,n){return this.changeDetector.watch(e,t,n)},b.prototype.watchGroup=function(e,t){return this.changeDetector.watchGroup(e,t)},b.prototype.watchText=function(e,t,n){return this.changeDetector.watchText(e,t,n)},b.prototype.getValue=function(e){return this.changeDetector.getValue(e)},b.prototype.setValue=function(e,t){return this.changeDetector.setValue(e,t)},b.prototype.eval=function(e){return this.changeDetector.eval(e)},b.prototype["new"]=function(e,t){return t===!0?t={locals:!0}:e===!0&&null==t&&(e=null,t={locals:!0}),this.changeDetector["new"](e,t)},b.prototype.bind=function(){var e,t,n,o,l,c,s;for(this.stopBinding=!0,n=0,l=0,c=arguments.length;c>l;l++)e=arguments[l],e instanceof a&&(t=e,n+=1),i.isElement(e)&&(o=e,n+=1);return s=arguments[n],s||(s={skip:this.skippedAttr()}),o||(o=this.element),t||(t=this.changeDetector),r.bind(t,o,s)},k=function(){return function(e,t,n){var o,a,l,s,u,f,p,h,d,m,v,y,x,k,$,E,B,T,_,N,S,O,L,M,j,F,I,V;if(x={attr:[],dir:[],children:[]},s={directive:0,hook:0,skipToElement:null,fb:x},n=n||{},j=!1,I=n.skip_attr,n.skip===!0?n.skip_top=!0:I||(I=n.skip||[]),I instanceof Array||(I=[I]),!n.skip_top){for(o={list:_=[],element:t,skip_attr:I,attr_type:"E",cd:e},l=t.nodeName.toLowerCase(),A(l,o),("script"===l||"style"===l)&&(j=!0),o.attr_type="A",L=t.attributes,$=0,E=L.length;E>$;$++)a=L[$],A(a.name,o);if(n.attachDirective){M=n.attachDirective;for(l in M)M[l],A(l,o);}for(_=_.sort(C),N=0,B=_.length;B>N;N++)if(h=_[N],!h.skip){if(h.noDirective)throw "Directive not found: "+h.name;if(h.skip=!0,V=n.attachDirective&&n.attachDirective[h.attrName]?n.attachDirective[h.attrName]:t.getAttribute(h.attrName),h.is_attr)w(e,t,V,h.attrName)&&x.attr.push({attrName:h.attrName,value:V});else {d=h.directive,v=new b({element:t,attrName:h.attrName,attrArgument:h.attrArgument||null,attributes:_,stopBinding:!1,elementCanBeRemoved:n.elementCanBeRemoved,fbElement:n.fbElement}),r.debug.directive&&console.log("bind",h.attrName,V,h);try{"stopBinding"===d.$init(e,t,V,v)&&(j=!0);}catch(g){m=g,r.exceptionHandler(m,"Error in directive: "+h.attrName,{value:V,env:v,cd:e,scope:e.scope,element:t});}if(v.fastBinding?(y=i.isFunction(v.fastBinding)?v.fastBinding:d.init,x.dir.push({fb:y,attrName:h.attrName,value:V,attrArgument:v.attrArgument,fbData:v.fbData})):s.directive++,v.stopBinding){j=!0;break}v.skipToElement&&(s.skipToElement=v.skipToElement);}}}if(!j)for(F=null,f=function(){var e,n,r,i;for(r=t.childNodes,i=[],n=0,e=r.length;e>n;n++)u=r[n],i.push(u);return i}(),k=S=0,T=f.length;T>S;k=++S)u=f[k],u&&(F?F===u&&(F=null):(n.fbElement&&(p={fbElement:n.fbElement.childNodes[k]}),O=D(e,u,p),s.directive+=O.directive,s.hook+=O.hook,F=O.skipToElement,O.fb&&(O.fb.text||O.fb.attr&&O.fb.attr.length||O.fb.dir&&O.fb.dir.length||O.fb.children&&O.fb.children.length)&&x.children.push({index:k,fb:O.fb})));return s}}(),D=function(e,t,n){var i,o,a,l,c,s,u;if(s={directive:0,hook:0,skipToElement:null,fb:null},r.hooks.binding.length)for(c=r.hooks.binding,o=0,a=c.length;a>o;o++)if(i=c[o],s.hook+=1,l=i.fn(e,t,n),l&&l.owner)return s;return 1===t.nodeType?(l=k(e,t,n),s.directive+=l.directive,s.hook+=l.hook,s.skipToElement=l.skipToElement,s.fb=l.fb):3===t.nodeType?(u=$(e,t,n),u&&(s.fb={text:u})):8===t.nodeType&&(l=x(e,t,n),l&&(s.directive+=l.directive,s.skipToElement=l.skipToElement)),s},r.nextTick=function(){var e,t,n;return n=null,t=[],e=function(){var e,i,o,l,c,s,u;for(n=null,i=t.slice(),t.length=0,c=0,s=i.length;s>c;c++){l=i[c],e=l[0],u=l[1];try{e.call(u);}catch(a){o=a,r.exceptionHandler(o,"$nextTick, error in function",{fn:e,self:u});}}return null},function(r){return t.push([r,this]),n?void 0:n=setTimeout(e,0)}}(),r.bind=function(e,t,n){var o,a,l,c,s,u;if(!e)throw "No changeDetector";if(!t)throw "No element";if(n=n||{},r.option.domOptimization&&!n.noDomOptimization&&r.utils.optmizeElement(t),u=e.root,o=!u.finishBinding_lock,o&&(u.finishBinding_lock=!0,u.bindingResult={directive:0,hook:0}),s=D(e,t,n),u.bindingResult.directive+=s.directive,u.bindingResult.hook+=s.hook,e.digest(),o){for(u.finishBinding_lock=!1,c=u.watchers.finishBinding.slice(),u.watchers.finishBinding.length=0,a=0,l=c.length;l>a;a++)(c[a])();s.total=u.bindingResult;}return s},!function(){function e(e,t,n,r,i,o){r.callback.apply(null,o);var a=t._properties.root;a&&a.topCD&&a.topCD.scan({zone:!0});}var t=r.bind;r.bind=function(n,i,o){var a=n.root,l=r.option.zone;if(l){var c=l===!0?Zone:l,s=a.zone;if(s||(a.zone=s=c.current.fork({name:c.current.name+".x",properties:{root:a},onInvokeTask:e})),c.current!==s)return a.zone.run(t,null,[n,i,o])}return t(n,i,o)};}(),r.bootstrap=function(e,t){if(!e)return r.bootstrap("[al-app]"),r.bootstrap("[al\\:app]"),void r.bootstrap("[data-al-app]");var n;if(e instanceof r.core.ChangeDetector)n=e,e=t;else if(t instanceof r.core.ChangeDetector)n=t;else if(i.isFunction(t)){var o={};n=r.ChangeDetector(o),t.call(n,o);}else t&&(n=r.ChangeDetector(t));if(Array.isArray(e)){for(var a=void 0,l=0,c=e;l<c.length;l++){var s=c[l];a=r.bootstrap(s,n);}return a}if("string"==typeof e){for(var a=void 0,u=document.querySelectorAll(e),f=0,p=u;f<p.length;f++){var h=p[f];a=r.bootstrap(h,n);}return a}if(n||(n=r.ChangeDetector()),i.isElement(e)){for(var d,m,v=0,g=["al-app","al:app","data-al-app"];v<g.length&&(d=g[v],m=e.getAttribute(d),e.removeAttribute(d),!m);v++);var y;return m&&(y={skip_attr:[d],attachDirective:{}},r.d.al.ctrl?y.attachDirective["al-ctrl"]=m:y.attachDirective[m+"!"]=""),r.bind(n,e,y),n}r.exceptionHandler("Error in bootstrap","Error input arguments",{input:e});};var E,B;r.utils.getId=function(){var e,t;return t=function(){var e,t,n,r,i,o;for(o="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),n=Math.floor((new Date).valueOf()/1e3)-1388512800,i="";n>0;)e=Math.floor(n/62),r=62*e,t=n-r,n=e,i=o[t]+i;return i}(),e=1,function(){return t+"#"+e++}}(),r.utils.clone=E=function(e,t){var n,r,i,o;if(null==t&&(t=128),1>t)return null;if(!e)return e;if("object"==typeof e){if(e instanceof Array)return i=function(){var r,i,o;for(o=[],r=0,i=e.length;i>r;r++)n=e[r],o.push(E(n,t-1));return o}();if(e instanceof Date)return new Date(e.valueOf());if(e.nodeType&&"function"==typeof e.cloneNode)return e;i={};for(r in e)o=e[r],"$"!==r[0]&&(i[r]=E(o,t-1));return i}return e},r.utils.equal=B=function(e,t,n){var r,i,o,a,l,c,s,u;if(null==n&&(n=128),1>n)return !0;if(!e||!t)return e===t;if(c=typeof e,s=typeof t,c!==s)return !1;if("object"===c){if(e instanceof Array){if(e.length!==t.length)return !1;for(r=i=0,a=e.length;a>i;r=++i)if(u=e[r],!B(u,t[r],n-1))return !1;return !0}if(e instanceof Date)return e.valueOf()===t.valueOf();if(e.nodeType&&"function"==typeof e.cloneNode)return e===t;l={};for(o in e)if(u=e[o],"$"!==o[0]&&(l[o]=!0,!B(u,t[o],n-1)))return !1;for(o in t)if(u=t[o],"$"!==o[0]&&!l[o]&&!B(u,e[o],n-1))return !1;return !0}return e===t},r.exceptionHandler=function(e,t,n){var r;return r=[],t&&r.push(t),e&&e.message&&r.push(e.message),n&&r.push(n),e&&r.push(e.stack?e.stack:e),console.error.apply(console,r)},function(){var e,t,n,i,o,a;return a=function(){var e,t,n,r;for(r={},e=0,n=arguments.length;n>e;e++)t=arguments[e],r[t]=!0;return r},o=a("instanceof","typeof","in","null","true","false","undefined","return"),t=function(){var e;return e=/[a-zA-Z\u0410-\u044F\u0401\u0451_\.\$]/,function(t){return t.match(e)}}(),n=function(e){return e.charCodeAt()>=48&&e.charCodeAt()<=57},i=function(){var e;return e=a("+","-",">","<","=","&","|","^","!","~"),function(t){return e[t]||!1}}(),e=a("=","+=","-=","++","--","|=","^=","&=","!=","<<=",">>="),r.utils.parsExpression=function(l,c){var s,u,f,p,h,d,m,v,g,y;return c=c||{},h=a.apply(null,c.input||[]),y=1,d=function(r){var o,a,l,c,s,u,f,p,h,m,v,g,b,x,k,D,$,C,A,E,B;for(b=r.line,x=r.result||[],m=r.index||0,g=r.level||0,$=r.stopKey||null,E="",v=null,B=[],k="",f="",D=!1,C="",A="",h="",c=0,p=null,u=function(){return h&&x.push({type:"free",value:h}),h=""};m<=b.length;)if(l=b[m-1],o=b[m++]||"",a=b[m],(D&&h||!o)&&u(),"string"!==D){if("key"===D){if(t(o)||n(o)){E+=o;continue}if("["===o){if(E+=o,s=d({line:b,index:m,level:g+1,stopKey:"]"}),!s.stopKeyOk)throw "Error expression";m=s.index,E+="###"+s.uniq+"###]",B.push(s);continue}if("?"===o&&("."===a||"("===a||"["===a)){E+=o;continue}if("("===o){if(E+=o,s=d({line:b,index:m,level:g+1,stopKey:")"}),!s.stopKeyOk)throw "Error expression";m=s.index,E+="###"+s.uniq+"###)",B.push(s);continue}v={type:"key",value:E,start:m-E.length-1,finish:m-1,children:B},x.push(v),D="",E="",B=[];}else if("sign"===D){if(i(o)){k+=o;continue}if("|"===k&&0===g&&0===c){p=b.substring(m-1),m=b.length+1;continue}(e[k]||"="===k[0]&&"="!==k[1])&&(v.assignment=!0),x.push({type:"sign",value:k}),D="",k="";}else if("digit"===D){if(n(o)||"."===o){f+=o;continue}x.push({type:"digit",value:f}),f="";}if(t(o))D="key",E+=o;else if(i(o))D="sign",k+=o;else if(n(o))D="digit",f+=o;else if('"'!==o&&"'"!==o){if(o===$)return u(),{result:x,index:m,stopKeyOk:!0,uniq:y++};"("===o&&c++,")"===o&&c--,"{"!==o?(":"===o&&"}"===$&&(v.type="free"),h+=o):(u(),s=d({line:b,index:m,level:g+1,stopKey:"}"}),x.push({type:"{}",child:s}),m=s.index);}else C=o,D="string",A+=o;}else {if(o===C&&"\\"!==l){A+=o,x.push({type:"string",value:A}),A="",C="",D="";continue}A+=o;}return u(),{result:x,index:m,filter:p}},f=d({line:l}),m={isSimple:!f.filter,simpleVariables:[]},f.filter?(m.expression=l.substring(0,l.length-f.filter.length-1),m.filter=f.filter):m.expression=l,v=function(e){var t;return t=e.split(/[\.\[\(\?]/),{count:t.length,firstPart:t[0]}},g=function(e,t){return t?"($$="+e+",$$==null)?undefined:":"($$=$$"+e+",$$==null)?undefined:"},p=function(e){return e.split(/[\.\[\(\?]/)[0]},u=function(e){var t,n,r,i,a,l,c,s,u,f;if("this"===e)return "$$scope";if(t=p(e),i=o[t]||h[t],"this"===t&&(e="$$scope"+e.slice(4),i=!0),s=e.split("?"),1===s.length)return i?e:"$$scope."+e;for(i?(f=g(s[0],!0),n=s[0]):(f=g("scope."+s[0]),n="scope."+s[0]),u=s.slice(1,s.length-1),r=0,l=u.length;l>r;r++)c=u[r],"("===c[0]?f+=g(n+c,i):(f+=g(c),n+=c);
    		return a=s[s.length-1],"("===a[0]?(i||(f+="$$"),f+=n+a):f+="$$"+a,"("+f+")"},s=function(e){var t,n,r,i,a,l,c,f,p,d,g,y,b;for(y="",d=e.result,i=0,c=d.length;c>i;i++)if(r=d[i],"key"!==r.type)y+="{}"!==r.type?r.value:"{"+s(r.child)+"}";else {if(r.assignment?(b=v(r.value),p="this"===b.firstPart?"$$scope"+r.value.substring(4):h[b.firstPart]?r.value:b.count<2?"($$scope.$$root || $$scope)."+r.value:"$$scope."+r.value,m.isSimple=!1):o[r.value]?p=r.value:(p=u(r.value),m.simpleVariables.push(p)),r.children.length)for(g=r.children,a=0,f=g.length;f>a;a++)t=g[a],l="###"+t.uniq+"###",n=s(t),p=p.split(l).join(n);y+=p;}return y},m.result=s(f),r.debug.parser&&console.log(l,m),m},r.utils.parsFilter=function(e){var t,n,i;for(i=[],e=e.trim();e;){if(t=e.match(/^(\w+)([^\w])(.*)$/),!t){if(t=e.match(/^(\w+)$/),!t)return null;i.push({name:t[1],args:[],raw:""});break}"|"===t[2]?(i.push({name:t[1],args:[],raw:""}),e=t[3]):(n=r.utils.parsArguments(t[3],{stop:"|"}),i.push({name:t[1],args:n.result,raw:t[3].slice(0,n.length)}),e=t[3].slice(n.length+1).trim());}return {result:i}},r.utils.parsArguments=function(e,t){var n,r,i,o,a,l,c,s;for(t=t||{},a=0,i=[],r="",o=0,c=!1,s=!1,l=function(){r&&(i.push(r),r="");};a<=e.length;)if(n=e[a]||"",a++,c)r+=n,'"'===n&&(c=!1);else if(s)r+=n,"'"===n&&(s=!1);else if('"'!==n)if("'"!==n)if(o)r+=n,"("===n&&o++,")"===n&&o--;else if(" "!==n&&","!==n){if(t.stop&&t.stop===n){l();break}"("===n&&(o=1),r+=n;}else l();else r+=n,s=!0;else r+=n,c=!0;return l(),{result:i,length:a-1}}}(),function(){var e,t,n;return r.utils.pars_start_tag="{{",r.utils.pars_finish_tag="}}",n=function(e){var t,n,i,o,a,l,c,s,u;return u=r.utils.pars_start_tag,n=r.utils.pars_finish_tag,c=[],o=0,l=0,i=function(t){var n;return t=t||1,n=e.substring(l,o-t),l=o,n},s=null,a=function(t,r,l){var u,f,p,h;for(t||(s={type:"expression",list:[]},c.push(s)),h=null,u=null;o<e.length;){if(h=u,u=e[o],o+=1,f=h+u,p=e[o],u===r)return;if(!l){if(f===n&&0===t)return s.list.push(i(2)),!0;"("===u?a(t+1,")"):"{"===u?a(t+1,"}"):'"'===u?a(t+1,'"',!0):"'"===u?a(t+1,"'",!0):"|"===u&&0===t&&("|"===p?o+=1:s.list.push(i()));}}},t=function(){var t,n,r,l,s;for(r=null,t=null;o<e.length;)if(r=t,t=e[o],o+=1,n=r+t,n===u){if(s=i(2),s&&c.push({type:"text",value:s}),!a(0))throw "Wrong expression"+e;t=null;}return l=i(-1),l?c.push({type:"text",value:l}):void 0},t(),r.debug.parser&&console.log("parsText",c),c},e={},t=function(e){var t,n;return function(){var r,i,o;for(o=[],r=0,i=e.length;i>r;r++)t=e[r],n={type:t.type,value:t.value},t.list&&(n.list=t.list.slice()),o.push(n);return o}()},r.utils.parsText=function(r){var i;return i=e[r],i||(e[r]=i=n(r)),t(i)}}(),function(){var e;return r.utils.compile=e={},e.cache={},e.Function=Function,e.expression=function(t,n){var i,o,l,c,s,u,f,p;if(n=n||{},t=t.trim(),u=t+"#",u+=n.no_return?"+":"-",u+=n.string?"s":"v",n.input&&(u+=n.input.join(",")),s=e.cache[u])return s;s=r.utils.parsExpression(t,{input:n.input}),l=s.result,f=n.no_return||!1,f?p="var $$;"+l:n.string&&!s.filter?(p="var $$, __ = ("+l+"); return '' + (__ || (__ == null?'':__))",s.rawExpression="(__="+l+") || (__ == null?'':__)"):p="var $$;return ("+l+")";try{n.input?(i=n.input.slice(),i.unshift("$$scope"),i.push(p),c=e.Function.apply(null,i)):c=e.Function("$$scope",p);}catch(a){throw o=a,r.exceptionHandler(o,"Wrong expression: "+t,{src:t,cfg:n}),"Wrong expression: "+l}return s.fn=c,e.cache[u]=s},e.cacheText={},e.buildText=function(t,n){var r,i,o,a,l,c,s;if(o=e.cacheText[t])return function(){return o.call(n)};for(s=[],l=a=0,c=n.length;c>a;l=++a)r=n[l],"expression"===r.type?s.push(r.fn?"this["+l+"].fn(this.scope)":"((x=this["+l+"].value) || (x == null?'':x))"):r.value&&(i=r.value.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n"),s.push('"'+i+'"'));return s=s.join(" + "),o=e.Function("var x; return ("+s+")"),e.cacheText[t]=o,function(){return o.call(n)}},e.cacheSimpleText={},e.buildSimpleText=function(t,n){var r,i,o,a,l,c,s,u,f;if(c=t?e.cacheSimpleText[t]:null,c||!n)return c||null;for(u=[],f=[],l=a=0,s=n.length;s>a;l=++a)r=n[l],"expression"===r.type?(u.push("("+r.re+")"),r.simpleVariables&&f.push.apply(f,r.simpleVariables)):r.value&&(i=r.value.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n"),u.push('"'+i+'"'));return u=u.join(" + "),o=e.Function("$$scope","var $$, __; return ("+u+")"),c={fn:o,simpleVariables:f},t&&(e.cacheSimpleText[t]=c),c}}();var T,_,N;return N=function(e){var t,n,r,i;if(!e.length)return "el";for(i="el",n=0,r=e.length;r>n;n++)t=e[n],i+=".childNodes["+t+"]";return i},_=function(e){var t,n,i,o,a,l,c;for(i=r.utils.parsText(e),o=0,l=i.length;l>o;o++)if(n=i[o],"expression"===n.type){if(n.list.length>1)return null;if(a=n.list[0],"#"===a[0])return null;if("="===a[0])return null;if("::"===a.slice(0,2))return null;if(t=r.utils.compile.expression(a,{string:!0}),!t.rawExpression)throw "Error";n.re=t.rawExpression;}return c=r.utils.compile.buildSimpleText(e,i),c.fn},r.core.fastBinding=function(e){return r.option.fastBinding&&!e.directive&&!e.hook&&e.fb?new T(e):void 0},T=function(e){var t,n,i,o;return n=this,i=[],n.fastWatchFn=[],t=[],o=function(e,r){var a,l,c,s,u,f,p,h,d,m,v,g,y,b,w,x;if(e.dir)for(b=N(t),v=e.dir,s=0,h=v.length;h>s;s++)a=v[s],i.push("s.dir("+n.fastWatchFn.length+", "+b+");"),n.fastWatchFn.push(a);if(e.attr)for(g=e.attr,u=0,d=g.length;d>u;u++)c=g[u],x=c.value,f=c.attrName,b=N(t),l=_(x),w=x.replace(/"/g,'\\"').replace(/\n/g,"\\n"),l?(i.push('s.fw("'+w+'", '+n.fastWatchFn.length+", "+b+', "'+f+'");'),n.fastWatchFn.push(l)):i.push("s.wt('"+w+"', "+b+", '"+f+"');");if(e.text&&(b=N(t),l=_(e.text),w=e.text.replace(/"/g,'\\"').replace(/\n/g,"\\n"),l?(i.push('s.fw("'+w+'", '+n.fastWatchFn.length+", "+b+");"),n.fastWatchFn.push(l)):i.push('s.wt("'+w+'", '+b+");")),e.children)for(y=e.children,p=0,m=y.length;m>p;p++)c=y[p],t.length=r+1,t[r]=c.index,o(c.fb,r+1);},o(e.fb,0),i=i.join("\n"),n.resultFn=r.utils.compile.Function("s","el","f$",i),this},T.prototype.bind=function(e,t){this.currentCD=e,this.resultFn(this,t,i);},T.prototype.dir=function(e,t){var n,r,i,o;r=this.fastWatchFn[e],n=this.currentCD,i=new b({attrName:r.attrName,attrArgument:r.attrArgument,changeDetector:n,fbData:r.fbData}),o=r.fb.call(i,n.scope,t,r.value,i),o&&o.start&&o.start();},T.prototype.fw=function(e,t,n,r){var i,o,a,l;i=this.currentCD,o=this.fastWatchFn[t],a=o(i.locals),l={isStatic:!1,isArray:!1,extraLoop:!1,deep:!1,value:a,callback:null,exp:o,src:e,onStop:null,el:n,ea:r||null},i.watchList.push(l),f(i.scope,l,a);},T.prototype.wt=function(e,t,n){this.currentCD.watchText(e,null,{element:t,elementAttr:n});},function(){var e,t,n,o,a,l,c,s;return r.hooks.attribute.unshift({code:"events",fn:function(){var e;e=this.attrName.match(/^\@([\w\.\-]+)$/),e&&(this.ns="al",this.name="on",this.attrArgument=e[1]);}}),r.hooks.eventModifier={},s=function(e,t){return r.hooks.eventModifier[e]={event:["keydown","keypress","keyup"],fn:function(e,n){e[t]||(n.stop=!0);}}},s("alt","altKey"),s("control","ctrlKey"),s("ctrl","ctrlKey"),s("meta","metaKey"),s("shift","shiftKey"),r.hooks.eventModifier.self=function(e,t){return e.target!==t.element?t.stop=!0:void 0},r.hooks.eventModifier.once={beforeExec:function(e,t){return t.unbind()}},n=function(e,t){var n,r,o,a,l,c;if(c={},"string"==typeof e?c.event=e:"object"==typeof e&&e.event&&(c.event=e.event),"string"==typeof c.event&&(c.event=c.event.split(/\s+/)),t&&c.event){for(o=!1,l=c.event,r=0,a=l.length;a>r;r++)if(n=l[r],t.indexOf(n)>=0){o=!0;break}if(!o)return null}return i.isFunction(e)?c.fn=e:e.fn&&(c.fn=e.fn),e.beforeExec&&(c.beforeExec=e.beforeExec),e.init&&(c.init=e.init),c},r.d.al.on=function(t,n,o,l){var s,u;l.attrArgument&&(r.option.removeAttribute&&(n.removeAttribute(l.attrName),l.fbElement&&l.fbElement.removeAttribute(l.attrName)),u=l.attrArgument.split(".")[0],s=function(){},s.prototype=c(l.attrArgument,e[u]),o&&(s.prototype.fn=l.changeDetector.compile(o,{no_return:!0,input:["$event","$element","$value"]})),s.prototype.expression=o,l.fastBinding=function(e,t,n,r){var o,c,u,f,p,h;for(u=new s,u.scope=e,u.element=t,u.cd=r.changeDetector,o=function(e){return a(u,e)},h=u.eventList,f=0,p=h.length;p>f;f++)c=h[f],i.on(t,c,o);u.initFn&&u.initFn(e,t,n,r),u.unbind=function(){var e,n,r;for(r=u.eventList,e=0,n=r.length;n>e;e++)c=r[e],i.off(t,c,o);},r.changeDetector.watch("$destroy",u.unbind);},l.fastBinding(t,n,o,l));},l={enter:13,tab:9,"delete":46,backspace:8,esc:27,space:32,up:38,down:40,left:37,right:39},e={click:{stop:!0,prevent:!0},dblclick:{stop:!0,prevent:!0},submit:{stop:!0,prevent:!0},keyup:{filterByKey:!0},keypress:{filterByKey:!0},keydown:{filterByKey:!0}},c=function(e,t){var i,o,a,c,s,u,f,p,h;for(t=t||{},o={attrArgument:e,throttle:null,throttleTime:0,debounce:null,debounceId:null,initFn:null,eventList:null,stop:t.stop||!1,prevent:t.prevent||!1,scan:!0,modifiers:[]},i=e.split("."),a=i[0],c=null,p=r.hooks.eventModifier[a],p&&(p=n(p),p.event&&(o.eventList=p.event,p.fn&&o.modifiers.push(p),p.init&&(o.initFn=p.init))),o.eventList||(o.eventList=[a]),h=i.slice(1),s=0,f=h.length;f>s;s++)u=h[s],"stop"!==u?"prevent"!==u?"nostop"!==u?"noprevent"!==u?"noscan"!==u?"throttle-"!==u.substring(0,9)?"debounce-"!==u.substring(0,9)?(p=r.hooks.eventModifier[u],p?(p=n(p,o.eventList),p&&o.modifiers.push(p)):t.filterByKey&&(null===c&&(c={}),l[u]&&(u=l[u]),c[u]=!0)):o.debounce=Number(u.substring(9)):o.throttle=Number(u.substring(9)):o.scan=!1:o.prevent=!1:o.stop=!1:o.prevent=!0:o.stop=!0;return o.filterByKey=c,o},o=function(e,t){var n;return n=e.element,"checkbox"===n.type?n.checked:"radio"===n.type?n.value||n.checked:t.component?t.value:n.value},t=function(e,t){var n,a,l,c,s;for(s=e.modifiers,a=0,l=s.length;l>a;a++)c=s[a],c.beforeExec&&c.beforeExec(t,e);if(e.fn)try{e.fn(e.cd.locals,t,e.element,o(e,t));}catch(i){n=i,r.exceptionHandler(n,"Error in event: "+e.attrArgument+" = "+e.expression,{attr:e.attrArgument,exp:e.expression,scope:e.scope,cd:e.cd,element:e.element,event:t});}e.scan&&e.cd.scan();},a=function(e,n){var r,i,o,a,l,c;if(!e.filterByKey||e.filterByKey[n.keyCode]){if(e.modifiers.length)for(r=function(){},r.prototype=e,i=new r,i.stop=!1,c=e.modifiers,o=0,a=c.length;a>o;o++)if(l=c[o],l.fn&&(l.fn(n,i),i.stop))return;e.prevent&&n.preventDefault(),e.stop&&n.stopPropagation(),e.debounce?(e.debounceId&&clearTimeout(e.debounceId),e.debounceId=setTimeout(function(){return e.debounceId=null,t(e,n)},e.debounce)):e.throttle?e.throttleTime<Date.now()&&(e.throttleTime=Date.now()+e.throttle,t(e,n)):t(e,n);}}}(),r.hooks.attribute.unshift({code:"directDirective",fn:function(){var e=this.attrName.match(/^(.*)\!$/);if(e){var t=e[1].replace(/(-\w)/g,function(e){return e.substring(1).toUpperCase()}),n=this.cd.locals[t]||r.ctrl[t]||r.option.globalController&&window[t];i.isFunction(n)?this.directive=function(e,t,i,o){var a=o.changeDetector;if(i){for(var l=r.utils.parsArguments(i),c=Array(l.result.length),s=0;s<l.result.length;s++)c[s]=r.utils.compile.expression(l.result[s],{input:["$element","$env"]}).fn(a.locals,t,o);n.apply(a,c);}else n.call(a,e,t,i,o);}:(this.result="noDirective",this.stop=!0);}}}),r.hooks.attribute.unshift({code:"elementVariable",fn:function(){var e=this.attrName.match(/^#([\w\.]*)$/);e&&(this.directive=n,this.attrArgument=e[1]);}}),r.d.al.value=function(e,t,n,r){var i,o;return r.fastBinding=!0,i=function(){r.setValue(n,t.value),o.refresh(),r.scan();},r.on(t,"input",i),r.on(t,"change",i),o=r.watch(n,function(e){return null==e&&(e=""),t.value=e,"$scanNoChanges"})},r.d.al.checked=function(e,t,n,i){function o(e){var n=i.takeAttr(e);return r.option.removeAttribute&&(t.removeAttribute(e),i.fbElement&&i.fbElement.removeAttribute(e)),n}function a(e,t){var n=o(t);if(n)return c.opt[e]=n,!0;var r=o(":"+t)||o("al-attr."+t);return r?(c.watch.push([r,e]),!0):void 0}function l(e,t,n){for(var r in t.fbData.opt)e[r]=t.fbData.opt[r];for(var i=function(r){var i=r[1];t.watch(r[0],function(t){e[i]=t,n();});},o=0,a=t.fbData.watch;o<a.length;o++){var l=a[o];i(l);}}var c=i.fbData={opt:{},watch:[]};a("value","value")?i.fastBinding=function(e,t,n,r){function i(){return t.checked=a&&a.indexOf(c.value)>=0,"$scanNoChanges"}var o,a=null,c={};l(c,r,i),o=r.watch(n,function(e){a=e,Array.isArray(a)||(a=null),i();},{isArray:!0}),r.on(t,"change",function(){if(a||(a=[],r.setValue(n,a)),t.checked)a.indexOf(c.value)<0&&a.push(c.value);else {var e=a.indexOf(c.value);e>=0&&a.splice(e,1);}o.refresh(),r.scan();});}:(a("true","true-value"),a("false","false-value"),i.fastBinding=function(e,t,n,r){function i(){return t.checked=o===c["true"],"$scanNoChanges"}var o,a,c={"true":!0,"false":!1};l(c,r,i),a=r.watch(n,function(e){o=e,i();}),r.on(t,"change",function(){o=t.checked?c["true"]:c["false"],r.setValue(n,o),a.refresh(),r.scan();});}),i.fastBinding(e,t,n,i);},r.d.al["if"]=function(e,t,n,o){var a;return o.elementCanBeRemoved?(r.exceptionHandler(null,o.attrName+" can't control element because of "+o.elementCanBeRemoved,{scope:e,element:t,value:n,env:o}),{}):(o.stopBinding=!0,a={item:null,childCD:null,base_element:null,top_element:null,start:function(){a.prepare(),a.watchModel();},prepare:function(){a.base_element=t,a.top_element=document.createComment(" "+o.attrName+": "+n+" "),i.before(t,a.top_element),i.remove(t);},updateDom:function(e){e?a.insertBlock(e):a.removeBlock();},removeBlock:function(){a.childCD&&(a.childCD.destroy(),a.childCD=null,a.removeDom(a.item),a.item=null);},insertBlock:function(){a.childCD||(a.item=a.base_element.cloneNode(!0),a.insertDom(a.top_element,a.item),a.childCD=o.changeDetector["new"](),r.bind(a.childCD,a.item,{skip_attr:o.skippedAttr(),elementCanBeRemoved:o.attrName}));},watchModel:function(){o.watch(n,a.updateDom);},removeDom:function(e){i.remove(e);},insertDom:function(e,t){i.after(e,t);}})},r.d.al.ifnot=function(e,t,n,i){var o;return o=r.d.al["if"](e,t,n,i),o.updateDom=function(e){e?o.removeBlock():o.insertBlock();},o},r.directives.al.repeat={restrict:"AM",init:function(e,t,n,o){var a,l;return o.elementCanBeRemoved?(r.exceptionHandler(null,o.attrName+" can't control element because of "+o.elementCanBeRemoved,{scope:e,element:t,value:n,env:o}),{}):(o.stopBinding=!0,a=o.changeDetector,l={start:function(){l.parsExpression(),l.prepareDom(),l.buildUpdateDom(),l.watchModel();},parsExpression:function(){var e,t;if(t=n.trim(),"("===t[0])if(l.objectMode=!0,e=t.match(/\((\w+),\s*(\w+)\)\s+in\s+(.+)\s+orderBy:(.+)\s*$/))l.objectKey=e[1],l.objectValue=e[2],l.expression=e[3]+(" | toArray:"+l.objectKey+","+l.objectValue+" | orderBy:"+e[4]),l.nameOfKey="$item",l.trackExpression="$item."+l.objectKey;else {if(e=t.match(/\((\w+),\s*(\w+)\)\s+in\s+(.+)\s*$/),!e)throw "Wrong repeat: "+n;l.objectKey=e[1],l.objectValue=e[2],l.expression=e[3]+(" | toArray:"+l.objectKey+","+l.objectValue),l.nameOfKey="$item",l.trackExpression="$item."+l.objectKey;}else {if(e=t.match(/(.*) track by ([\w\.\$\(\)]+)/),e&&(l.trackExpression=e[2],t=e[1]),e=t.match(/\s*(\w+)\s+in\s+(.+)/),!e)throw "Wrong repeat: "+n;l.nameOfKey=e[1],l.expression=e[2];}},watchModel:function(){var e;e=l.objectMode?{deep:!0}:{isArray:!0},l.watch=a.watch(l.expression,l.updateDom,e);},prepareDom:function(){var e,a,c,s,u,f;if(8===t.nodeType){for(l.top_element=t,l.element_list=a=[],e=t.nextSibling;e;){if(8===e.nodeType&&(u=e.nodeValue,f=u.trim().split(/\s+/),"/directive:"===f[0]&&"al-repeat"===f[1])){o.skipToElement=e;break}a.push(e),e=e.nextSibling;}for(c=0,s=a.length;s>c;c++)e=a[c],i.remove(e);}else l.base_element=t,l.top_element=document.createComment(" "+n+" "),i.before(t,l.top_element),i.remove(t),r.option.removeAttribute&&t.removeAttribute(o.attrName);},makeChild:function(e,t,n){var r;return r=a["new"](null,{locals:!0}),l.updateLocals(r,e,t,n),r},updateLocals:function(e,t,n,r){var i;i=e.locals,l.objectMode?(i[l.objectKey]=t[l.objectKey],i[l.objectValue]=t[l.objectValue]):i[l.nameOfKey]=t,i.$index=n,i.$first=0===n,i.$last=n===r.length-1;},rawUpdateDom:function(e,t){var n,r,o,a,l,c;for(r=0,l=e.length;l>r;r++)n=e[r],i.remove(n);for(a=0,c=t.length;c>a;a++)o=t[a],i.after(o.after,o.element);},buildUpdateDom:function(){return l.updateDom=function(){var e,n,i,c,s,u,f,p,h,d,m,v,g;return m=[],u=0,i=null,g=0,v=o.skippedAttr(),"$index"===l.trackExpression?(f={},h=function(){return f[u]||null},p=function(e){null!=e.$id&&delete f[e.$id];},d=function(e,t){t.$id=u,f[u]=t;}):l.trackExpression?(f={},e=function(){var e;return e=a.compile(l.trackExpression,{input:["$id",l.nameOfKey]}),function(t,n){return e(a.scope,t,n)}}(),n=function(e){var t;return (t=e.$alite_id)?t:t=e.$alite_id=r.utils.getId()},h=function(t){var r;return r=e(n,t),null!=r?f[r]:null},p=function(e){var t;t=e.$id,null!=t&&delete f[t];},d=function(t,r){var i;i=e(n,t),r.$id=i,f[i]=r;}):window.Map?(f=new Map,h=function(e){return f.get(e)},p=function(e){f["delete"](e.item);},d=function(e,t){f.set(e,t);}):(f={},h=function(e){var t;return "object"!=typeof e?f[e]||null:(t=e.$alite_id)?f[t]:null},p=function(e){var t;t=e.$id,f[t]&&(e.$id=null,delete f[t]);},d=function(e,t){var n;"object"==typeof e?(n=r.utils.getId(),e.$alite_id=n,t.$id=n,f[n]=t):(t.$id=e,f[e]=t);}),c=[],s=function(e){var t,n;if(n=typeof e,"object"!==n){if("number"===n)t=Math.floor(e);else if("string"===n&&(t=Math.floor(e),isNaN(t)))return [];if(t<c.length)c.length=t;else for(;c.length<t;)c.push(c.length);return c}return e&&e.length?e:[]},l.element_list?function(e){var t,n,i,a,c,f,g,y,b,w,x,k,D,$,C,A,E,B,T,_,N,S,O,L,M,j,F,I,V,H,K,R,W,U,q,P,G;for(M=s(e),A=l.top_element,a=[],H=[],b=0,E=m.length;E>b;b++)V=m[b],V.active=!1;for(u=D=0,B=M.length;B>D;u=++D)x=M[u],V=h(x),V&&(V.active=!0);for(c=[],$=0,T=m.length;T>$;$++)if(V=m[$],!V.active){for(V.prev&&(V.prev.next=V.next),V.next&&(V.next.prev=V.prev),p(V),V.CD.destroy(),q=V.element_list,C=0,_=q.length;_>C;C++)f=q[C],c.push(f);V.next=null,V.prev=null,V.element_list=null;}for(t=[],U=null,W=!1,g=l.element_list.length-1,u=j=0,N=M.length;N>j;u=++j)if(x=M[u],k=x,V=h(x)){if(l.updateLocals(V.CD,x,u,M),V.prev===U){if(W)for(P=V.element_list,F=0,S=P.length;S>F;F++)f=P[F],a.push({element:f,after:A}),A=f;U=V,A=V.element_list[g],V.active=!0,H.push(V);continue}for(V.prev=U,U&&(U.next=V),G=V.element_list,K=0,O=G.length;O>K;K++)f=G[K],a.push({element:f,after:A}),A=f;W=!0,U=V,V.active=!0,H.push(V);}else i=l.makeChild(k,u,M),y=function(){var e,r,o,c;for(o=l.element_list,c=[],r=0,e=o.length;e>r;r++)n=o[r],f=n.cloneNode(!0),t.push({cd:i,el:f}),a.push({element:f,after:A}),c.push(A=f);return c}(),V={CD:i,element_list:y,prev:U,next:null,active:!0,item:x},d(x,V),U?(I=U.next,U.next=V,V.next=I,I&&(I.prev=V)):0===u&&m[0]&&(I=m[0],V.next=I,I.prev=V),U=V,H.push(V);for(m=H,l.rawUpdateDom(c,a),c.length=0,a.length=0,R=0,L=t.length;L>R;R++)w=t[R],r.bind(w.cd,w.el,{skip_attr:v,elementCanBeRemoved:o.attrName,noDomOptimization:!0});}:function(e){var n,a,c,f,y,b,w,x,k,D,$,C,A,E,B,T,_,N,S,L,M,j;for(T=s(e),C=l.top_element,g++,c=[],S=[],n=[],M=null,L=!1,u=b=0,A=T.length;A>b;u=++b)if(x=T[u],k=x,N=h(x)){if(l.updateLocals(N.CD,x,u,T),N.prev===M){L&&c.push({element:N.element,after:M.element}),M=N,C=N.element,N.version=g,S.push(N);continue}N.prev=M,M&&(M.next=N),c.push({element:N.element,after:C}),L=!0,C=N.element,M=N,N.version=g,S.push(N);}else a=l.makeChild(k,u,T),t=l.base_element.cloneNode(!0),null===i?(y=l.base_element.cloneNode(!0),j=r.bind(a,t,{skip_attr:v,elementCanBeRemoved:o.attrName,noDomOptimization:!0,fbElement:y}),i=r.core.fastBinding(j)||!1,i&&(l.base_element=y)):n.push({cd:a,el:t}),c.push({element:t,after:C}),N={CD:a,element:t,prev:M,next:null,version:g,item:x},C=t,d(x,N),M?(_=M.next,M.next=N,N.next=_,_&&(_.prev=N)):0===u&&m[0]&&(_=m[0],N.next=_,_.prev=N),M=N,S.push(N);for(f=[],D=0,E=m.length;E>D;D++)N=m[D],N.version!==g&&(N.prev&&(N.prev.next=N.next),N.next&&(N.next.prev=N.prev),p(N),N.CD.destroy(),f.push(N.element),N.next=null,N.prev=null,N.element=null);for(m=S,l.rawUpdateDom(f,c),f.length=0,c.length=0,$=0,B=n.length;B>$;$++)w=n[$],i?i.bind(w.cd,w.el):r.bind(w.cd,w.el,{skip_attr:v,elementCanBeRemoved:o.attrName,noDomOptimization:!0});}}()}})}},r.d.al.init=function(e,t,n,i){var o,a,c,s,u;r.option.removeAttribute&&(t.removeAttribute(i.attrName),i.fbElement&&i.fbElement.removeAttribute(i.attrName)),o=i.changeDetector,u=["$element"],"window"===i.attrArgument&&u.push("window");try{s=o.compile(n,{no_return:!0,input:u}),i.fastBinding=c=function(e,t,n,r){return s(r.changeDetector.locals,t,window)},c(e,t,n,i);}catch(l){a=l,r.exceptionHandler(a,"al-init, error in expression: "+n,{exp:n,scope:e,cd:o,element:t}),i.fastBinding=function(){};}},r.d.al.app={stopBinding:!0},r.d.al.stop={restrict:"AE",stopBinding:!0},r.d.al.cloak=function(e,t,n,r){t.removeAttribute(r.attrName),n&&i.removeClass(t,n);},r.d.al.html={restrict:"AM",priority:100,modifier:{},link:function(e,t,n,o){var a;return o.elementCanBeRemoved&&8!==t.nodeType?(r.exceptionHandler(null,o.attrName+" can't control element because of "+o.elementCanBeRemoved,{scope:e,element:t,value:n,env:o}),{}):(o.stopBinding=!0,a={baseElement:null,topElement:null,activeElement:null,childCD:null,name:n,watchMode:null,start:function(){a.parsing(),a.prepare(),a.watchModel();},parsing:function(){var i,l,c,s;if(o.attrArgument)for(s=o.attrArgument.split("."),i=0,l=s.length;l>i;i++)c=s[i],"literal"!==c?"tpl"!==c?r.d.al.html.modifier[c]&&r.d.al.html.modifier[c](a,{scope:e,element:t,inputName:n,env:o}):a.watchMode="tpl":a.watchMode="literal";},prepare:function(){8===t.nodeType?(a.baseElement=null,a.topElement=t,o.watch("$destroy",a.removeBlock)):(a.baseElement=t,a.topElement=document.createComment(" "+o.attrName+": "+n+" "),i.before(t,a.topElement),i.remove(t));},removeBlock:function(){var e,t,n,r;if(a.childCD&&(a.childCD.destroy(),a.childCD=null),a.activeElement){if(Array.isArray(a.activeElement))for(r=a.activeElement,t=0,n=r.length;n>t;t++)e=r[t],a.removeDom(e);else a.removeDom(a.activeElement);a.activeElement=null;}},insertBlock:function(e){var t,n,i;if(a.baseElement)a.activeElement=a.baseElement.cloneNode(!1),a.activeElement.innerHTML=e,a.insertDom(a.topElement,a.activeElement),a.childCD=o.changeDetector["new"](),r.bind(a.childCD,a.activeElement,{skip_attr:o.skippedAttr(),elementCanBeRemoved:o.attrName});else for(i=document.createElement("body"),i.innerHTML=e,t=a.topElement,a.activeElement=[],a.childCD=o.changeDetector["new"]();n=i.firstChild;)a.insertDom(t,n),t=n,a.activeElement.push(n),r.bind(a.childCD,t,{skip_attr:o.skippedAttr(),elementCanBeRemoved:o.attrName});},updateDom:function(e){a.removeBlock(),e&&a.insertBlock(e);},removeDom:function(e){i.remove(e);},insertDom:function(e,t){i.after(e,t);},watchModel:function(){"literal"===a.watchMode?a.updateDom(a.name):"tpl"===a.watchMode?o.watchText(a.name,a.updateDom):o.watch(a.name,a.updateDom);}})}},r.d.al.html.modifier.id=function(e){return e.updateDom=function(t){var n,r;e.removeBlock(),r=document.getElementById(t),r&&(n=r.innerHTML,n&&e.insertBlock(n));}},r.d.al.html.modifier.url=function(e){return e.loadHtml=function(e){i.ajax(e);},e.updateDom=function(t){return t?void e.loadHtml({cache:!0,url:t,success:function(t){e.removeBlock(),e.insertBlock(t);},error:e.removeBlock}):void e.removeBlock()}},r.d.al.html.modifier.scope=function(e,t){var n,i,o,a;if(n=e.name.split(":"),2===n.length)e.name=n[0],a=n[1];else {if(n=e.name.match(/(.+)\:\s*\:\:([\d\w]+)$/))o=!0;else if(o=!1,n=e.name.match(/(.+)\:\s*([\.\w]+)$/),!n)throw "Wrong expression "+e.name;e.name=n[1],a=n[2];}return i="outer",e.insertBlock=function(n){var l,c,s;e.activeElement=e.baseElement.cloneNode(!1),e.activeElement.innerHTML=n,e.insertDom(e.topElement,e.activeElement),c=t.env.changeDetector,l=e.childCD=c["new"](null,{locals:!0}),l.locals[i]=null,s=c.watch(a,function(e){return l.locals[i]=e},{oneTime:o}),e.childCD.watch("$destroy",function(){return s.stop()}),r.bind(e.childCD,e.activeElement,{skip_attr:t.env.skippedAttr()});}},r.d.al.html.modifier.inline=function(e,t){var n;return n=e.prepare,e.prepare=function(){return n(),t.env.setValue(e.name,e.baseElement.innerHTML)}},r.d.al.radio=function(e,t,n,r){var i,o,a;return i=r.takeAttr("al-value"),o=i?r.eval(i):r.takeAttr("value"),r.on(t,"change",function(){r.setValue(n,o),a.refresh(),r.scan();}),a=r.watch(n,function(e){return t.checked=o===e,"$scanNoChanges"})},function(){var e;return window.Map?(e=function(){return this.idByItem=new Map,this.itemById={},this.index=1,this},e.prototype.acquire=function(e){var t;return t="i"+this.index++,this.idByItem.set(e,t),this.itemById[t]=e,t},e.prototype.release=function(e){var t;t=this.itemById[e],delete this.itemById[e],this.idByItem["delete"](t);},e.prototype.replace=function(e,t){var n;n=this.itemById[e],this.idByItem["delete"](n),this.idByItem.set(t,e),this.itemById[e]=t;},e.prototype.getId=function(e){return this.idByItem.get(e)},e.prototype.getItem=function(e){return this.itemById[e]||null}):(e=function(){return this.itemById={"i#null":null},this},e.prototype.acquire=function(e){var t;return null===e?"i#null":("object"==typeof e?(t=e.$alite_id,t||(e.$alite_id=t=r.utils.getId())):t=""+e,this.itemById[t]=e,t)},e.prototype.release=function(e){delete this.itemById[e];},e.prototype.replace=function(e,t){this.itemById[e]=t;},e.prototype.getId=function(e){return null===e?"i#null":"object"==typeof e?e.$alite_id:""+e},e.prototype.getItem=function(e){return this.itemById[e]||null}),r.d.al.select=function(t,n,i,o){var a,l,c,s,u,f;return a=o.changeDetector["new"](),o.stopBinding=!0,a.$select={mapper:c=new e},l=null,a.$select.change=function(){return r.nextTick(function(){return u(l)})},u=function(e){var t;return t=c.getId(e),t?n.value=t:n.selectedIndex=-1},f=a.watch(i,function(e){return l=e,u(e)}),s=function(e){return l=c.getItem(e.target.value),a.setValue(i,l),f.refresh(),a.scan()},o.on(n,"input",s),o.on(n,"change",s),r.bind(a,n,{skip_attr:o.skippedAttr()})},r.d.al.option=function(e,t,n,i){var o,l,c,s,u,f;for(o=f=i.changeDetector,c=0;4>=c&&!(u=f.$select);++c)f=f.parent||{};return u?(s=u.mapper,l=null,o.watch(n,function(e){l?s.getId(e)!==l?(s.release(l),l=s.acquire(e),t.value=l,u.change()):s.replace(l,e):(l=s.acquire(e),t.value=l,u.change());}),void o.watch("$destroy",function(){return s.release(l),u.change()})):void r.exceptionHandler("","Error in al-option - al-select is not found",{cd:o,scope:o.scope,element:t,value:n})}}(),function(){var e;return r.hooks.attribute.unshift({code:"attribute",fn:function(){var e,t;e=this.attrName.match(/^\:([\w\.\-]+)$/),e&&(t=e[1],"html"===t.split(".")[0]?(this.name="html",t=t.substring(5)):this.name="attr",this.ns="al",this.attrArgument=t);}}),e={checked:"checked",readonly:"readOnly",value:"value",selected:"selected",muted:"muted",disabled:"disabled",hidden:"hidden"},r.d.al.attr=function(t,n,o,a){var l,c,s,u,f,p,h,d,m,v;if(a.attrArgument){if(s=a.attrArgument.split("."),c=s[0],h=e[c],f=s.indexOf("tpl")>0,r.option.removeAttribute&&(n.removeAttribute(a.attrName),a.fbElement&&a.fbElement.removeAttribute(a.attrName)),l={readOnly:!0},d=null,"style"===c){if(!s[1])throw "Style is not declared";m=s[1].replace(/(-\w)/g,function(e){return e.substring(1).toUpperCase()}),d=function(e,t){return null==t&&(t=""),e.style[m]=t};}else "class"===c&&s.length>1?(f=!1,p=s.slice(1),d=function(e,t){var n,r,o,a,l;if(t)for(r=0,a=p.length;a>r;r++)n=p[r],i.addClass(e,n);else for(o=0,l=p.length;l>o;o++)n=p[o],i.removeClass(e,n);}):"focus"===c?d=function(e,t){return t?e.focus():e.blur()}:h?d=function(e,t){return void 0===t&&(t=null),e[h]!==t?e[h]=t:void 0}:(l.element=n,l.elementAttr=c);v=f?"watchText":"watch",u=d?function(e,t,n,r){return r.changeDetector[v](o,function(e){return d(t,e)},l)}:function(e,t,n,r){return r.changeDetector[v](o,null,{readOnly:!0,element:t,elementAttr:c})},u(t,n,o,a),a.fastBinding=u;}}}(),r.d.al.model=function(e,t,n,i){var o;if(o=t.nodeName.toLowerCase(),"select"===o)return r.d.al.select.call(this,e,t,n,i);if("input"===o){if("checkbox"===t.type)return r.d.al.checked.call(this,e,t,n,i);if("radio"===t.type)return r.d.al.radio.call(this,e,t,n,i)}return r.d.al.value.call(this,e,t,n,i)},r.filters.slice=function(e,t,n){return e?n?e.slice(t,n):e.slice(t):null},function(){var e;return e=function(e){return 10>e?"0"+e:""+e},r.filters.date=function(t,n){var r,i,o,a,l;if(!t)return "";for(t=new Date(t),l=[[/yyyy/g,t.getFullYear()],[/mm/g,e(t.getMonth()+1)],[/dd/g,e(t.getDate())],[/HH/g,e(t.getHours())],[/MM/g,e(t.getMinutes())],[/SS/g,e(t.getSeconds())]],a=n,i=0,o=l.length;o>i;i++)r=l[i],a=a.replace(r[0],r[1]);return a}}(),r.filters.json={watchMode:"deep",fn:function(e){return JSON.stringify(r.utils.clone(e),null,4)}},r.filters.filter=function(e,t,n){var r,i,o,a,l,c,s,u,f,p,h,d;if(2===arguments.length)l=null,d=t;else {if(3!==arguments.length)return e;l=t,d=n;}if(!e||null==d||""===d)return e;if(u=[],p=(""+d).toLowerCase(),l)for(i=0,c=e.length;c>i;i++)r=e[i],r[l]===d?u.push(r):(f=(""+r[l]).toLowerCase(),f.indexOf(p)>=0&&u.push(r));else for(o=0,s=e.length;s>o;o++){r=e[o];for(a in r)h=r[a],h===d?u.push(r):(f=(""+h).toLowerCase(),f.indexOf(p)>=0&&u.push(r));}return u},r.filters.orderBy=function(e,t,n){return !e instanceof Array?null:(n=n?1:-1,e.sort(function(e,r){return e[t]<r[t]?-n:e[t]>r[t]?n:0}))},r.filters.throttle={init:function(e,t,n){var r;return t=Number(t),r=null,{onChange:function(e){return r&&clearTimeout(r),r=setTimeout(function(){return r=null,n.setValue(e),n.changeDetector.scan()},t)}}}},r.filters.toArray={init:function(e,t,n){var r,i,o;return 2===n.conf.args.length?(r=n.conf.args[0],o=n.conf.args[1]):(r="key",o="value"),i=[],{watchMode:"deep",onChange:function(e){var t,a,l;i.length=0;for(a in e)l=e[a],t={},t[r]=a,t[o]=l,i.push(t);return n.setValue(i)}}}},r.filters.storeTo={init:function(e,t,n){return {onChange:function(e){return n.changeDetector.setValue(t,e),n.setValue(e)}}}},r.text["="]=function(e,t,n,i){var o;if(o=r.utils.compile.expression(t),o.filters)throw "Conflict: bindonce and filters, use one-time binding";i["finally"](o.fn(i.changeDetector.locals));},r.text["::"]=function(e,t,n,r){r.changeDetector.watch(t,function(e){return r["finally"](e)},{oneTime:!0});},function(){function e(e){return e.replace(/(-\w)/g,function(e){return e.substring(1).toUpperCase()})}function t(t){var r,i=t.listener,o=t.childCD,a=t.name,l=t.parentName,c=t.parentCD,s={};if(a=e(a),i&&i!==!0)if(n.isFunction(i))r=i;else {if(r=i.onChange,"copy"===i||"copy"===i.watchMode)return void(r?r(l):o.scope[a]=l);("array"===i||"array"===i.watchMode)&&(s.isArray=!0),("deep"===i||"deep"===i.watchMode)&&(s.deep=!0);}r||(r=function(e){o.scope[a]=e,o.scan();}),c.watch(l,r,s);}var n=r.f$;r.component=function(i,o){var a,l,c=i.match(/^(\w+)[\-](.+)$/);c?(a=c[1],l=c[2]):(a="$global",l=i),l=e(l),r.d[a]||(r.d[a]={}),r.d[a][l]={restrict:"E",stopBinding:!0,priority:r.priority.$component,init:function(e,a,l,c){function s(e,n){var r=":"+e,i=d.takeAttr(r);if(!i){if(i=d.takeAttr(e),!i)return;n="copy";}t({childCD:h,listener:n,name:e,parentName:i,parentCD:p});}function u(){N||p.digest(),r.bind(h,a,{skip:!0});}var f={$sendEvent:function(e,t){var n=new CustomEvent(e);n.value=t,n.component=!0,a.dispatchEvent(n);}},p=c.changeDetector["new"](),h=r.ChangeDetector(f),d=new b({element:a,attributes:c.attributes,changeDetector:h,parentChangeDetector:p});try{var m=o.call(h,f,a,d)||{};}catch(v){return void r.exceptionHandler(v,"Error in component <"+i+">: ",{element:a,scope:f,cd:h})}m.onStart&&h.watch("$finishBinding",function(){m.onStart(),h.scan();});var g=!1;p.watch("$destroy",function(){g=!0,h.destroy();}),h.watch("$destroy",function(){m.onDestroy&&m.onDestroy(),g||p.destroy();});for(var y=0,w=a.attributes;y<w.length;y++){var x=w[y];if("#"===x.name[0]){var k=x.name.slice(1);if(k){m.api?p.setValue(k,m.api):p.setValue(k,f);break}}}if(m.props)if(Array.isArray(m.props))for(var D=0,$=m.props;D<$.length;D++){var C=$[D];s(C,!0);}else for(var C in m.props)s(C,m.props[C]);else for(var A=0,E=a.attributes;A<E.length;A++){var x=E[A],B=x.name,T=x.value;if(T){var _=B.match(/^\:(.*)$/);_&&t({childCD:h,name:_[1],parentName:T,parentCD:p});}}var N=!1;if(p.watch("$onScanOnce",function(){return N=!0}),m.template&&(a.innerHTML=m.template),m.templateId){var S=document.getElementById(m.templateId);if(!S)throw "No template "+m.templateId;a.innerHTML=S.innerHTML;}m.templateUrl?n.ajax({url:m.templateUrl,cache:!0,success:function(e){a.innerHTML=e,u();
    		},error:function(){console.error("Template is not loaded",m.templateUrl);}}):u();}};};}(),r}var t=e();t.makeInstance=e,"function"==typeof alightInitCallback?alightInitCallback(t):module.exports=t;}(); 
    	} (alight));
    	return alight.exports;
    }

    /*!
    * rete-alight-render-plugin v0.1.5 
    * (c) 2018  License 
    * Released under the ISC license.
    */

    (function (module, exports) {
    	!function(t){var l,e=Object.prototype,u=e.hasOwnProperty,n="function"==typeof Symbol?Symbol:{},o=n.iterator||"@@iterator",r=n.asyncIterator||"@@asyncIterator",i=n.toStringTag||"@@toStringTag",c=t.regeneratorRuntime;if(c)(module.exports=c);else {(c=t.regeneratorRuntime=module.exports).wrap=x;var d="suspendedStart",p="suspendedYield",h="executing",f="completed",v={},s={};s[o]=function(){return this};var g=Object.getPrototypeOf,y=g&&g(g(S([])));y&&y!==e&&u.call(y,o)&&(s=y);var m=L.prototype=b.prototype=Object.create(s);k.prototype=m.constructor=L,L.constructor=k,L[i]=k.displayName="GeneratorFunction",c.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return !!e&&(e===k||"GeneratorFunction"===(e.displayName||e.name))},c.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,L):(t.__proto__=L,i in t||(t[i]="GeneratorFunction")),t.prototype=Object.create(m),t},c.awrap=function(t){return {__await:t}},E(_.prototype),_.prototype[r]=function(){return this},c.AsyncIterator=_,c.async=function(t,e,n,r){var o=new _(x(t,e,n,r));return c.isGeneratorFunction(e)?o:o.next().then(function(t){return t.done?t.value:o.next()})},E(m),m[i]="Generator",m[o]=function(){return this},m.toString=function(){return "[object Generator]"},c.keys=function(n){var r=[];for(var t in n)r.push(t);return r.reverse(),function t(){for(;r.length;){var e=r.pop();if(e in n)return t.value=e,t.done=!1,t}return t.done=!0,t}},c.values=S,O.prototype={constructor:O,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=l,this.done=!1,this.delegate=null,this.method="next",this.arg=l,this.tryEntries.forEach(N),!t)for(var e in this)"t"===e.charAt(0)&&u.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=l);},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(n){if(this.done)throw n;var r=this;function t(t,e){return i.type="throw",i.arg=n,r.next=t,e&&(r.method="next",r.arg=l),!!e}for(var e=this.tryEntries.length-1;0<=e;--e){var o=this.tryEntries[e],i=o.completion;if("root"===o.tryLoc)return t("end");if(o.tryLoc<=this.prev){var a=u.call(o,"catchLoc"),c=u.call(o,"finallyLoc");if(a&&c){if(this.prev<o.catchLoc)return t(o.catchLoc,!0);if(this.prev<o.finallyLoc)return t(o.finallyLoc)}else if(a){if(this.prev<o.catchLoc)return t(o.catchLoc,!0)}else {if(!c)throw new Error("try statement without catch or finally");if(this.prev<o.finallyLoc)return t(o.finallyLoc)}}}},abrupt:function(t,e){for(var n=this.tryEntries.length-1;0<=n;--n){var r=this.tryEntries[n];if(r.tryLoc<=this.prev&&u.call(r,"finallyLoc")&&this.prev<r.finallyLoc){var o=r;break}}o&&("break"===t||"continue"===t)&&o.tryLoc<=e&&e<=o.finallyLoc&&(o=null);var i=o?o.completion:{};return i.type=t,i.arg=e,o?(this.method="next",this.next=o.finallyLoc,v):this.complete(i)},complete:function(t,e){if("throw"===t.type)throw t.arg;return "break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),v},finish:function(t){for(var e=this.tryEntries.length-1;0<=e;--e){var n=this.tryEntries[e];if(n.finallyLoc===t)return this.complete(n.completion,n.afterLoc),N(n),v}},catch:function(t){for(var e=this.tryEntries.length-1;0<=e;--e){var n=this.tryEntries[e];if(n.tryLoc===t){var r=n.completion;if("throw"===r.type){var o=r.arg;N(n);}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,n){return this.delegate={iterator:S(t),resultName:e,nextLoc:n},"next"===this.method&&(this.arg=l),v}};}function x(t,e,n,r){var i,a,c,l,o=e&&e.prototype instanceof b?e:b,u=Object.create(o.prototype),s=new O(r||[]);return u._invoke=(i=t,a=n,c=s,l=d,function(t,e){if(l===h)throw new Error("Generator is already running");if(l===f){if("throw"===t)throw e;return A()}for(c.method=t,c.arg=e;;){var n=c.delegate;if(n){var r=C(n,c);if(r){if(r===v)continue;return r}}if("next"===c.method)c.sent=c._sent=c.arg;else if("throw"===c.method){if(l===d)throw l=f,c.arg;c.dispatchException(c.arg);}else "return"===c.method&&c.abrupt("return",c.arg);l=h;var o=w(i,a,c);if("normal"===o.type){if(l=c.done?f:p,o.arg===v)continue;return {value:o.arg,done:c.done}}"throw"===o.type&&(l=f,c.method="throw",c.arg=o.arg);}}),u}function w(t,e,n){try{return {type:"normal",arg:t.call(e,n)}}catch(t){return {type:"throw",arg:t}}}function b(){}function k(){}function L(){}function E(t){["next","throw","return"].forEach(function(e){t[e]=function(t){return this._invoke(e,t)};});}function _(l){var e;this._invoke=function(n,r){function t(){return new Promise(function(t,e){!function e(t,n,r,o){var i=w(l[t],l,n);if("throw"!==i.type){var a=i.arg,c=a.value;return c&&"object"==typeof c&&u.call(c,"__await")?Promise.resolve(c.__await).then(function(t){e("next",t,r,o);},function(t){e("throw",t,r,o);}):Promise.resolve(c).then(function(t){a.value=t,r(a);},o)}o(i.arg);}(n,r,t,e);})}return e=e?e.then(t,t):t()};}function C(t,e){var n=t.iterator[e.method];if(n===l){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=l,C(t,e),"throw"===e.method))return v;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method");}return v}var r=w(n,t.iterator,e.arg);if("throw"===r.type)return e.method="throw",e.arg=r.arg,e.delegate=null,v;var o=r.arg;return o?o.done?(e[t.resultName]=o.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=l),e.delegate=null,v):o:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,v)}function j(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e);}function N(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e;}function O(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(j,this),this.reset(!0);}function S(e){if(e){var t=e[o];if(t)return t.call(e);if("function"==typeof e.next)return e;if(!isNaN(e.length)){var n=-1,r=function t(){for(;++n<e.length;)if(u.call(e,n))return t.value=e[n],t.done=!1,t;return t.value=l,t.done=!0,t};return r.next=r}}return {next:A}}function A(){return {value:l,done:!0}}}(function(){return this}()||Function("return this")()),function(t,e){module.exports=e(requireAlight());}(commonjsGlobal,function(t){function s(t){return t.toLowerCase().replace(/ /g,"-")}return function(t){if(t&&"undefined"!=typeof window){var e=document.createElement("style");e.setAttribute("type","text/css"),e.innerHTML=t,document.head.appendChild(e);}}(".node {\n  background: rgba(110, 136, 255, 0.8);\n  border: 2px solid #4e58bf;\n  border-radius: 10px;\n  cursor: pointer;\n  min-width: 180px;\n  height: auto;\n  padding-bottom: 6px;\n  box-sizing: content-box;\n  position: relative;\n  user-select: none; }\n  .node:hover {\n    background: rgba(130, 153, 255, 0.8); }\n  .node.selected {\n    background: #ffd92c;\n    border-color: #e3c000; }\n  .node .title {\n    color: white;\n    font-family: sans-serif;\n    font-size: 18px;\n    padding: 8px; }\n  .node .socket {\n    display: inline-block;\n    cursor: pointer;\n    border: 1px solid white;\n    border-radius: 12px;\n    width: 24px;\n    height: 24px;\n    margin: 6px;\n    vertical-align: middle;\n    background: #96b38a;\n    z-index: 2;\n    box-sizing: border-box; }\n    .node .socket:hover {\n      border-width: 4px; }\n    .node .socket.multiple {\n      border-color: yellow; }\n    .node .socket.output {\n      margin-right: -12px; }\n    .node .socket.input {\n      margin-left: -12px; }\n  .node .input-title, .node .output-title {\n    vertical-align: middle;\n    color: white;\n    display: inline-block;\n    font-family: sans-serif;\n    font-size: 14px;\n    margin: 6px;\n    line-height: 24px; }\n  .node .input-control {\n    z-index: 1;\n    width: calc(100% - 36px);\n    vertical-align: middle;\n    display: inline-block; }\n  .node .control {\n    padding: 6px 18px; }\n  .node select, .node input {\n    width: 100%;\n    border-radius: 30px;\n    background-color: white;\n    padding: 2px 6px;\n    border: 1px solid #999;\n    font-size: 110%;\n    width: 170px; }\n"),{install:function(e,a){var c=t.makeInstance(),l=t.makeInstance();function u(t){return e.selected.contains(t)}c.directives.al.socket=function(t,e,n,r){var o=r.changeDetector.locals,i=n;t.bindSocket(e,i,o[i]);},c.directives.al.control=function(t,e,n,r){var o=r.changeDetector.locals,i=o.input?o.input.control:o.control;t.bindControl(e,i);},e.on("rendernode",function(t){var e=t.el,n=t.node,r=t.component,o=t.bindSocket,i=t.bindControl;r.render&&"alight"!==r.render||(e.innerHTML=r.template||a.template||function(t){var e="";try{var n={};e+="<div class=\"node {{isSelected(node)?'selected':''}} {{toClassName(node.name)}}\">",e+='<div class="title">',e+="{{node.name}}</div>",e+="\x3c!-- Outputs--\x3e",e+='<div al-repeat="output in Array.from(node.outputs.values())" style="text-align: right">',e+='<div class="output-title">',e+="{{output.name}}</div>",e+='<div class="socket output {{toClassName(output.socket.name)}}" al-socket="output" title="{{output.socket.name}}\n{{output.socket.hint}}"></div></div>',e+="\x3c!-- Controls--\x3e",e+='<div class="control" al-repeat="control in Array.from(node.controls.values())" al-control></div>',e+="\x3c!-- Inputs--\x3e",e+='<div al-repeat="input in Array.from(node.inputs.values())" style="text-align: left">',e+='<div class="socket input {{toClassName(input.socket.name)}} {{input.multipleConnections?\'multiple\':\'\'}}" al-socket="input" title="{{input.socket.name}}"></div>',e+='<div class="input-title" al-if="!input.showControl()">',e+="{{input.name}}</div>",e+='<div class="input-control" al-if="input.showControl()" al-control></div></div></div>';}catch(t){pug.rethrow(t,void 0,void 0,n[void 0]);}return e}(),n._alight=c.bootstrap(e,{node:n,isSelected:u,bindSocket:o,bindControl:i,toClassName:s,Array:Array}));}),e.on("rendercontrol",function(t){var e=t.el,n=t.control;if(!n.render||"alight"===n.render){var r=document.createElement("div"),o=n.template||"",i=n.scope||{},a=n.mounted||function(){};e.appendChild(r),r.innerHTML=o,n.render="alight",n._alight=l.bootstrap(r,i),a.call(n);}}),e.on("connectioncreated connectionremoved",function(t){t.input.node._alight.scan();}),e.on("nodeselected",function(t){e.nodes.map(function(t){return t._alight.scan()}),t._alight.scan();});}}});
    	
    } (alightRenderPlugin_min));

    var alightRenderPlugin_minExports = alightRenderPlugin_min.exports;
    var AlightRenderPlugin = /*@__PURE__*/getDefaultExportFromCjs(alightRenderPlugin_minExports);

    /*!
    * rete-area-plugin v0.2.1 
    * (c) 2019  
    * Released under the ISC license.
    */
    function ___$insertStyle(css) {
      if (!css) {
        return;
      }
      if (typeof window === 'undefined') {
        return;
      }

      var style = document.createElement('style');

      style.setAttribute('type', 'text/css');
      style.innerHTML = css;
      document.head.appendChild(style);
      return css;
    }

    ___$insertStyle(".rete-background {\n  display: table;\n  z-index: -1;\n  position: absolute;\n  top: -320000px;\n  left: -320000px;\n  width: 640000px;\n  height: 640000px;\n}\n.rete-background.default {\n  background-size: 32px 32px;\n  background-image: linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px);\n}");

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
    }

    function _toConsumableArray(arr) {
      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
    }

    function _arrayWithoutHoles(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

        return arr2;
      }
    }

    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }

    function _iterableToArray(iter) {
      if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
    }

    function _iterableToArrayLimit(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance");
    }

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }

    var Background = function Background(editor, element) {
      _classCallCheck(this, Background);

      if (!element) return;
      var el = element instanceof HTMLElement ? element : document.createElement('div');
      el.classList += " rete-background ".concat(element === true ? 'default' : '');
      editor.view.area.appendChild(el);
    };

    var Restrictor =
    /*#__PURE__*/
    function () {
      function Restrictor(editor, scaleExtent, translateExtent) {
        _classCallCheck(this, Restrictor);

        this.editor = editor;
        this.scaleExtent = scaleExtent;
        this.translateExtent = translateExtent;
        if (scaleExtent) editor.on('zoom', this.restrictZoom.bind(this));
        if (translateExtent) editor.on('translate', this.restrictTranslate.bind(this));
      }

      _createClass(Restrictor, [{
        key: "restrictZoom",
        value: function restrictZoom(data) {
          var se = typeof this.scaleExtent === 'boolean' ? {
            min: 0.1,
            max: 1
          } : this.scaleExtent;
          data.transform;
          if (data.zoom < se.min) data.zoom = se.min;else if (data.zoom > se.max) data.zoom = se.max;
        }
      }, {
        key: "restrictTranslate",
        value: function restrictTranslate(data) {
          var te = typeof this.translateExtent === 'boolean' ? {
            width: 5000,
            height: 4000
          } : this.translateExtent;
          var container = this.editor.view.container;
          var k = data.transform.k;
          var kw = te.width * k,
              kh = te.height * k;
          var cx = container.clientWidth / 2;
          var cy = container.clientHeight / 2;
          data.x -= cx;
          data.y -= cy;
          if (data.x > kw) data.x = kw;else if (data.x < -kw) data.x = -kw;
          if (data.y > kh) data.y = kh;else if (data.y < -kh) data.y = -kh;
          data.x += cx;
          data.y += cy;
        }
      }]);

      return Restrictor;
    }();

    var SnapGrid =
    /*#__PURE__*/
    function () {
      function SnapGrid(editor, _ref) {
        var _this = this;

        var _ref$size = _ref.size,
            size = _ref$size === void 0 ? 16 : _ref$size,
            _ref$dynamic = _ref.dynamic,
            dynamic = _ref$dynamic === void 0 ? true : _ref$dynamic;

        _classCallCheck(this, SnapGrid);

        this.editor = editor;
        this.size = size;
        if (dynamic) this.editor.on('nodetranslate', this.onTranslate.bind(this));else this.editor.on('rendernode', function (_ref2) {
          var node = _ref2.node,
              el = _ref2.el;
          el.addEventListener('mouseup', _this.onDrag.bind(_this, node));
          el.addEventListener('touchend', _this.onDrag.bind(_this, node));
          el.addEventListener('touchcancel', _this.onDrag.bind(_this, node));
        });
      }

      _createClass(SnapGrid, [{
        key: "onTranslate",
        value: function onTranslate(data) {
          var x = data.x,
              y = data.y;
          data.x = this.snap(x);
          data.y = this.snap(y);
        }
      }, {
        key: "onDrag",
        value: function onDrag(node) {
          var _node$position = _slicedToArray(node.position, 2),
              x = _node$position[0],
              y = _node$position[1];

          node.position[0] = this.snap(x);
          node.position[1] = this.snap(y);
          console.log(this, x, y, node.position);
          this.editor.view.nodes.get(node).update();
          this.editor.view.updateConnections({
            node: node
          });
        }
      }, {
        key: "snap",
        value: function snap(value) {
          return Math.round(value / this.size) * this.size;
        }
      }]);

      return SnapGrid;
    }();

    var min = function min(arr) {
      return arr.length === 0 ? 0 : Math.min.apply(Math, _toConsumableArray(arr));
    };

    var max = function max(arr) {
      return arr.length === 0 ? 0 : Math.max.apply(Math, _toConsumableArray(arr));
    };

    function nodesBBox(editor, nodes) {
      var left = min(nodes.map(function (node) {
        return node.position[0];
      }));
      var top = min(nodes.map(function (node) {
        return node.position[1];
      }));
      var right = max(nodes.map(function (node) {
        return node.position[0] + editor.view.nodes.get(node).el.clientWidth;
      }));
      var bottom = max(nodes.map(function (node) {
        return node.position[1] + editor.view.nodes.get(node).el.clientHeight;
      }));
      return {
        left: left,
        right: right,
        top: top,
        bottom: bottom,
        width: Math.abs(left - right),
        height: Math.abs(top - bottom),
        getCenter: function getCenter() {
          return [(left + right) / 2, (top + bottom) / 2];
        }
      };
    }

    function zoomAt(editor) {
      var nodes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : editor.nodes;
      var bbox = nodesBBox(editor, nodes);

      var _bbox$getCenter = bbox.getCenter(),
          _bbox$getCenter2 = _slicedToArray(_bbox$getCenter, 2),
          x = _bbox$getCenter2[0],
          y = _bbox$getCenter2[1];

      var _ref = [editor.view.container.clientWidth, editor.view.container.clientHeight],
          w = _ref[0],
          h = _ref[1];
      var area = editor.view.area;
      var kw = w / bbox.width,
          kh = h / bbox.height;
      var k = Math.min(kh * 0.9, kw * 0.9, 1);
      area.transform.x = area.container.clientWidth / 2 - x * k;
      area.transform.y = area.container.clientHeight / 2 - y * k;
      area.zoom(k, 0, 0);
      area.update();
    }

    function install(editor, params) {
      var background = params.background || false;
      var snap = params.snap || false;
      var scaleExtent = params.scaleExtent || false;
      var translateExtent = params.translateExtent || false;

      if (background) {
        this._background = new Background(editor, background);
      }

      if (scaleExtent || translateExtent) {
        this._restrictor = new Restrictor(editor, scaleExtent, translateExtent);
      }

      if (snap) {
        this._snap = new SnapGrid(editor, snap);
      }
    }

    var index = {
      install: install,
      zoomAt: zoomAt
    };

    const universalSocket = new index$2.Socket('Universal');
    const numSocket = new index$2.Socket('Number');

    numSocket.combineWith(universalSocket);
    universalSocket.combineWith(numSocket);
    universalSocket.compatibleWith = s => {
        return true;
    };

    class NumControl extends index$2.Control {
        constructor(emitter, key, readonly) {
            super(key);
            this.render = 'js';
            this.emitter = emitter;
            this.key = key;
            this.template = `<input type="number" :readonly="readonly" :value="value" @input="change($event)"/>`;

            this.scope = {
                value: 0,
                readonly,
                change: this.change.bind(this)
            };
        }

        setValue(val) {
            this.scope.value = val;
        }

        change(e){
            this.setValue(e.target.value);
            this.update();
        }

        update() {
            if (this.key)
                this.putData(this.key, parseFloat(this.scope.value));
        }

        mounted() {
            this.update();
        }

        setValue(val) {
            this.scope.value = val;
            this._alight.scan();
        }
    }


    class NumComponent extends index$2.Component {
        constructor(){
            super("Number");
        }

        builder(node) {

            let out1 = new index$2.Output('num', "Number", numSocket);
            let in1 = new index$2.Input('num1', "Number", numSocket);

            const numControl = new NumControl(this.editor, 'num', false);

            return node
            .addControl(numControl)
            .addOutput(out1)
            .addInput(in1)
        }

        worker(node, inputs, outputs) {
            outputs['num'] = node.data.num;
        }
    }

    class TextControl extends index$2.Control {
        constructor(emitter, key, readonly) {
            super(key);
            this.render = 'js';
            this.emitter = emitter;
            this.key = key;
            this.template = `<input type="text" :readonly="readonly" :value="value" @input="change($event)"/>`;

            this.scope = {
            value: "",
            readonly,
            change: this.change.bind(this)
            };
        }

        setValue(val) {
            this.scope.value = val;
        }

        change(e){
            this.setValue(e.target.value);
            this.update();
        }

        update() {
            if (this.key)
            this.putData(this.key, this.scope.value);
        }

        mounted() {
            this.update();
        }

        setValue(val) {
            this.scope.value = val;
            this._alight.scan();
        }
    }

    class TextInputComponent extends index$2.Component {
        constructor(){
            super("TextInput");
        }

        builder(node) {
            let in1 = new index$2.Input('text', "Text", universalSocket);
            const textControl = new TextControl(this.editor, 'text', false);

            return node
            .addControl(textControl)
            .addInput(in1);
        }

        worker(node, inputs, outputs) {
            const text = inputs['text'].length ? inputs['text'][0] : node.data.text;
            console.log(text);
            const control = this.editor.nodes.find(n => n.id == node.id).controls.get('text');
            control.scope.value = text;
            control.update();
        }
    }

    /* src/NodeEditor.svelte generated by Svelte v3.59.2 */
    const file$1 = "src/NodeEditor.svelte";

    function create_fragment$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "rete");
    			add_location(div, file$1, 46, 0, 1312);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NodeEditor', slots, []);

    	onMount(async () => {
    		const container = document.querySelector('#rete');
    		const editor = new index$2.NodeEditor('demo@0.1.0', container);
    		editor.use(index$1);
    		editor.use(AlightRenderPlugin);
    		editor.use(index);
    		const engine = new index$2.Engine('demo@0.1.0');
    		const components = [new NumComponent(), new TextInputComponent()];

    		components.forEach(c => {
    			editor.register(c);
    			engine.register(c);
    		});

    		const n1 = await components[0].createNode({ num: 2 });
    		n1.position = [80, 200];
    		const n2 = await components[0].createNode({ num: 3 });
    		n2.position = [180, 300];
    		editor.addNode(n2);
    		const n3 = await components[0].createNode({ num: 4 });
    		n3.position = [280, 400];
    		editor.addNode(n3);
    		const text1 = await components[1].createNode({ text: "Hello" });
    		text1.position = [180, 100];
    		editor.addNode(text1);
    		editor.addNode(n1);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NodeEditor> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		Rete: index$2,
    		ConnectionPlugin: index$1,
    		AlightRenderPlugin,
    		AreaPlugin: index,
    		NumComponent,
    		TextInputComponent
    	});

    	return [];
    }

    class NodeEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NodeEditor",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Tabs.svelte generated by Svelte v3.59.2 */
    const file = "src/Tabs.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (20:8) {#each $tabs as tab (tab.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let tab;
    	let current;

    	tab = new Tab({
    			props: {
    				tab: /*tab*/ ctx[6],
    				activeTab: /*activeTab*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(tab.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(tab, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tab_changes = {};
    			if (dirty & /*$tabs*/ 1) tab_changes.tab = /*tab*/ ctx[6];
    			tab.$set(tab_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(tab, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(20:8) {#each $tabs as tab (tab.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let button;
    	let t1;
    	let div1;
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t2;
    	let div0;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*$tabs*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*tab*/ ctx[6].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	var switch_value = /*$tabs*/ ctx[0].find(/*func*/ ctx[5]).content;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Add Tab";
    			t1 = space();
    			div1 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div0 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(button, "id", "add-tab-button");
    			add_location(button, file, 16, 4, 439);
    			attr_dev(ul, "class", "tab-list");
    			add_location(ul, file, 18, 6, 531);
    			attr_dev(div0, "class", "tab-content");
    			add_location(div0, file, 23, 6, 661);
    			attr_dev(div1, "class", "tabs");
    			add_location(div1, file, 17, 4, 506);
    			attr_dev(div2, "id", "app");
    			add_location(div2, file, 15, 0, 420);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, button);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ul, null);
    				}
    			}

    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			if (switch_instance) mount_component(switch_instance, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*addTab*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$tabs, activeTab*/ 9) {
    				each_value = /*$tabs*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}

    			if (dirty & /*$tabs, $activeTab*/ 3 && switch_value !== (switch_value = /*$tabs*/ ctx[0].find(/*func*/ ctx[5]).content)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div0, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $tabs;
    	let $activeTab;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tabs', slots, []);
    	let tabs = writable([{ id: 1, content: NodeEditor }]);
    	validate_store(tabs, 'tabs');
    	component_subscribe($$self, tabs, value => $$invalidate(0, $tabs = value));
    	let activeTab = writable(1);
    	validate_store(activeTab, 'activeTab');
    	component_subscribe($$self, activeTab, value => $$invalidate(1, $activeTab = value));

    	const addTab = () => {
    		let id = Math.max(...$tabs.map(t => t.id)) + 1;
    		tabs.update(t => [...t, { id, content: NodeEditor }]);
    		activeTab.set(id);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tabs> was created with unknown prop '${key}'`);
    	});

    	const func = t => t.id === $activeTab;

    	$$self.$capture_state = () => ({
    		writable,
    		Tab,
    		NodeEditor,
    		tabs,
    		activeTab,
    		addTab,
    		$tabs,
    		$activeTab
    	});

    	$$self.$inject_state = $$props => {
    		if ('tabs' in $$props) $$invalidate(2, tabs = $$props.tabs);
    		if ('activeTab' in $$props) $$invalidate(3, activeTab = $$props.activeTab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$tabs, $activeTab, tabs, activeTab, addTab, func];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let tabs;
    	let current;
    	tabs = new Tabs({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tabs.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tabs, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Tabs });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
