true              &&(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
}());

const sharedConfig = {
  context: undefined,
  registry: undefined,
  effects: undefined,
  done: false,
  getContextId() {
    return getContextId(this.context.count);
  },
  getNextContextId() {
    return getContextId(this.context.count++);
  }
};
function getContextId(count) {
  const num = String(count),
    len = num.length - 1;
  return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
}
function setHydrateContext(context) {
  sharedConfig.context = context;
}

const IS_DEV = false;
const equalFn = (a, b) => a === b;
const $PROXY = Symbol("solid-proxy");
const SUPPORTS_PROXY = typeof Proxy === "function";
const $TRACK = Symbol("solid-track");
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var Owner = null;
let Transition = null;
let ExternalSourceConfig = null;
let Listener = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener,
    owner = Owner,
    unowned = fn.length === 0,
    current = detachedOwner === undefined ? owner : detachedOwner,
    root = unowned ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: current ? current.context : null,
      owner: current
    },
    updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
  Owner = root;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || undefined
  };
  const setter = value => {
    if (typeof value === "function") {
      value = value(s.value);
    }
    return writeSignal(s, value);
  };
  return [readSignal.bind(s), setter];
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE);
  c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || undefined;
  updateComputation(c);
  return readSignal.bind(c);
}
function batch(fn) {
  return runUpdates(fn, false);
}
function untrack(fn) {
  if (Listener === null) return fn();
  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) ;
    return fn();
  } finally {
    Listener = listener;
  }
}
function on(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  let defer = options && options.defer;
  return prevValue => {
    let input;
    if (isArray) {
      input = Array(deps.length);
      for (let i = 0; i < deps.length; i++) input[i] = deps[i]();
    } else input = deps();
    if (defer) {
      defer = false;
      return prevValue;
    }
    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}
function onMount(fn) {
  createEffect(() => untrack(fn));
}
function onCleanup(fn) {
  if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
  return fn;
}
function getListener() {
  return Listener;
}
function getOwner() {
  return Owner;
}
function runWithOwner(o, fn) {
  const prev = Owner;
  const prevListener = Listener;
  Owner = o;
  Listener = null;
  try {
    return runUpdates(fn, true);
  } catch (err) {
    handleError(err);
  } finally {
    Owner = prev;
    Listener = prevListener;
  }
}
function startTransition(fn) {
  const l = Listener;
  const o = Owner;
  return Promise.resolve().then(() => {
    Listener = l;
    Owner = o;
    let t;
    runUpdates(fn, false);
    Listener = Owner = null;
    return t ? t.done : undefined;
  });
}
const [transPending, setTransPending] = /*@__PURE__*/createSignal(false);
function createContext(defaultValue, options) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  let value;
  return Owner && Owner.context && (value = Owner.context[context.id]) !== undefined ? value : context.defaultValue;
}
function children(fn) {
  const children = createMemo(fn);
  const memo = createMemo(() => resolveChildren(children()));
  memo.toArray = () => {
    const c = memo();
    return Array.isArray(c) ? c : c != null ? [c] : [];
  };
  return memo;
}
function readSignal() {
  if (this.sources && (this.state)) {
    if ((this.state) === STALE) updateComputation(this);else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this), false);
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current = node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o)) ;
          if (TransitionRunning ? !o.tState : !o.state) {
            if (o.pure) Updates.push(o);else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (!TransitionRunning) o.state = STALE;
        }
        if (Updates.length > 10e5) {
          Updates = [];
          if (IS_DEV) ;
          throw new Error();
        }
      }, false);
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const time = ExecCount;
  runComputation(node, node.value, time);
}
function runComputation(node, value, time) {
  let nextValue;
  const owner = Owner,
    listener = Listener;
  Listener = Owner = node;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    node.updatedAt = time + 1;
    return handleError(err);
  } finally {
    Listener = listener;
    Owner = owner;
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue);
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state: state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: Owner ? Owner.context : null,
    pure
  };
  if (Owner === null) ;else if (Owner !== UNOWNED) {
    {
      if (!Owner.owned) Owner.owned = [c];else Owner.owned.push(c);
    }
  }
  return c;
}
function runTop(node) {
  if ((node.state) === 0) return;
  if ((node.state) === PENDING) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if ((node.state) === STALE) {
      updateComputation(node);
    } else if ((node.state) === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  const e = Effects;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e), false);
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function runUserEffects(queue) {
  let i,
    userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user) runTop(e);else queue[userLength++] = e;
  }
  if (sharedConfig.context) {
    if (sharedConfig.count) {
      sharedConfig.effects || (sharedConfig.effects = []);
      sharedConfig.effects.push(...queue.slice(0, userLength));
      return;
    }
    setHydrateContext();
  }
  if (sharedConfig.effects && (!sharedConfig.count)) {
    queue = [...sharedConfig.effects, ...queue];
    userLength += sharedConfig.effects.length;
    delete sharedConfig.effects;
  }
  for (i = 0; i < userLength; i++) runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount)) runTop(source);
      } else if (state === PENDING) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates.push(o);else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(),
        index = node.sourceSlots.pop(),
        obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(),
          s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.tOwned) {
    for (i = node.tOwned.length - 1; i >= 0; i--) cleanNode(node.tOwned[i]);
    delete node.tOwned;
  }
  if (node.owned) {
    for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
    node.cleanups = null;
  }
  node.state = 0;
}
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function handleError(err, owner = Owner) {
  const error = castError(err);
  throw error;
}
function resolveChildren(children) {
  if (typeof children === "function" && !children.length) return resolveChildren(children());
  if (Array.isArray(children)) {
    const results = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveChildren(children[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children;
}
function createProvider(id, options) {
  return function provider(props) {
    let res;
    createRenderEffect(() => res = untrack(() => {
      Owner.context = {
        ...Owner.context,
        [id]: props.value
      };
      return children(() => props.children);
    }), undefined);
    return res;
  };
}

const FALLBACK = Symbol("fallback");
function dispose(d) {
  for (let i = 0; i < d.length; i++) d[i]();
}
function indexArray(list, mapFn, options = {}) {
  let items = [],
    mapped = [],
    disposers = [],
    signals = [],
    len = 0,
    i;
  onCleanup(() => dispose(disposers));
  return () => {
    const newItems = list() || [],
      newLen = newItems.length;
    newItems[$TRACK];
    return untrack(() => {
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          signals = [];
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot(disposer => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
        return mapped;
      }
      if (items[0] === FALLBACK) {
        disposers[0]();
        disposers = [];
        items = [];
        mapped = [];
        len = 0;
      }
      for (i = 0; i < newLen; i++) {
        if (i < items.length && items[i] !== newItems[i]) {
          signals[i](() => newItems[i]);
        } else if (i >= items.length) {
          mapped[i] = createRoot(mapper);
        }
      }
      for (; i < items.length; i++) {
        disposers[i]();
      }
      len = signals.length = disposers.length = newLen;
      items = newItems.slice(0);
      return mapped = mapped.slice(0, len);
    });
    function mapper(disposer) {
      disposers[i] = disposer;
      const [s, set] = createSignal(newItems[i]);
      signals[i] = set;
      return mapFn(s, i);
    }
  };
}
function createComponent(Comp, props) {
  return untrack(() => Comp(props || {}));
}
function trueFn() {
  return true;
}
const propTraps = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver;
    return _.get(property);
  },
  has(_, property) {
    if (property === $PROXY) return true;
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};
function resolveSource(s) {
  return !(s = typeof s === "function" ? s() : s) ? {} : s;
}
function resolveSources() {
  for (let i = 0, length = this.length; i < length; ++i) {
    const v = this[i]();
    if (v !== undefined) return v;
  }
}
function mergeProps(...sources) {
  let proxy = false;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    proxy = proxy || !!s && $PROXY in s;
    sources[i] = typeof s === "function" ? (proxy = true, createMemo(s)) : s;
  }
  if (SUPPORTS_PROXY && proxy) {
    return new Proxy({
      get(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          const v = resolveSource(sources[i])[property];
          if (v !== undefined) return v;
        }
      },
      has(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (property in resolveSource(sources[i])) return true;
        }
        return false;
      },
      keys() {
        const keys = [];
        for (let i = 0; i < sources.length; i++) keys.push(...Object.keys(resolveSource(sources[i])));
        return [...new Set(keys)];
      }
    }, propTraps);
  }
  const sourcesMap = {};
  const defined = Object.create(null);
  for (let i = sources.length - 1; i >= 0; i--) {
    const source = sources[i];
    if (!source) continue;
    const sourceKeys = Object.getOwnPropertyNames(source);
    for (let i = sourceKeys.length - 1; i >= 0; i--) {
      const key = sourceKeys[i];
      if (key === "__proto__" || key === "constructor") continue;
      const desc = Object.getOwnPropertyDescriptor(source, key);
      if (!defined[key]) {
        defined[key] = desc.get ? {
          enumerable: true,
          configurable: true,
          get: resolveSources.bind(sourcesMap[key] = [desc.get.bind(source)])
        } : desc.value !== undefined ? desc : undefined;
      } else {
        const sources = sourcesMap[key];
        if (sources) {
          if (desc.get) sources.push(desc.get.bind(source));else if (desc.value !== undefined) sources.push(() => desc.value);
        }
      }
    }
  }
  const target = {};
  const definedKeys = Object.keys(defined);
  for (let i = definedKeys.length - 1; i >= 0; i--) {
    const key = definedKeys[i],
      desc = defined[key];
    if (desc && desc.get) Object.defineProperty(target, key, desc);else target[key] = desc ? desc.value : undefined;
  }
  return target;
}
function splitProps(props, ...keys) {
  if (SUPPORTS_PROXY && $PROXY in props) {
    const blocked = new Set(keys.length > 1 ? keys.flat() : keys[0]);
    const res = keys.map(k => {
      return new Proxy({
        get(property) {
          return k.includes(property) ? props[property] : undefined;
        },
        has(property) {
          return k.includes(property) && property in props;
        },
        keys() {
          return k.filter(property => property in props);
        }
      }, propTraps);
    });
    res.push(new Proxy({
      get(property) {
        return blocked.has(property) ? undefined : props[property];
      },
      has(property) {
        return blocked.has(property) ? false : property in props;
      },
      keys() {
        return Object.keys(props).filter(k => !blocked.has(k));
      }
    }, propTraps));
    return res;
  }
  const otherObject = {};
  const objects = keys.map(() => ({}));
  for (const propName of Object.getOwnPropertyNames(props)) {
    const desc = Object.getOwnPropertyDescriptor(props, propName);
    const isDefaultDesc = !desc.get && !desc.set && desc.enumerable && desc.writable && desc.configurable;
    let blocked = false;
    let objectIndex = 0;
    for (const k of keys) {
      if (k.includes(propName)) {
        blocked = true;
        isDefaultDesc ? objects[objectIndex][propName] = desc.value : Object.defineProperty(objects[objectIndex], propName, desc);
      }
      ++objectIndex;
    }
    if (!blocked) {
      isDefaultDesc ? otherObject[propName] = desc.value : Object.defineProperty(otherObject, propName, desc);
    }
  }
  return [...objects, otherObject];
}
let counter = 0;
function createUniqueId() {
  const ctx = sharedConfig.context;
  return ctx ? sharedConfig.getNextContextId() : `cl-${counter++}`;
}

const narrowedError = name => `Stale read from <${name}>.`;
function Index(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(indexArray(() => props.each, props.children, fallback || undefined));
}
function Show(props) {
  const keyed = props.keyed;
  const conditionValue = createMemo(() => props.when, undefined, undefined);
  const condition = keyed ? conditionValue : createMemo(conditionValue, undefined, {
    equals: (a, b) => !a === !b
  });
  return createMemo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      const fn = typeof child === "function" && child.length > 0;
      return fn ? untrack(() => child(keyed ? c : () => {
        if (!untrack(condition)) throw narrowedError("Show");
        return conditionValue();
      })) : child;
    }
    return props.fallback;
  }, undefined, undefined);
}
function Switch(props) {
  const chs = children(() => props.children);
  const switchFunc = createMemo(() => {
    const ch = chs();
    const mps = Array.isArray(ch) ? ch : [ch];
    let func = () => undefined;
    for (let i = 0; i < mps.length; i++) {
      const index = i;
      const mp = mps[i];
      const prevFunc = func;
      const conditionValue = createMemo(() => prevFunc() ? undefined : mp.when, undefined, undefined);
      const condition = mp.keyed ? conditionValue : createMemo(conditionValue, undefined, {
        equals: (a, b) => !a === !b
      });
      func = () => prevFunc() || (condition() ? [index, conditionValue, mp] : undefined);
    }
    return func;
  });
  return createMemo(() => {
    const sel = switchFunc()();
    if (!sel) return props.fallback;
    const [index, conditionValue, mp] = sel;
    const child = mp.children;
    const fn = typeof child === "function" && child.length > 0;
    return fn ? untrack(() => child(mp.keyed ? conditionValue() : () => {
      if (untrack(switchFunc)()?.[0] !== index) throw narrowedError("Match");
      return conditionValue();
    })) : child;
  }, undefined, undefined);
}
function Match(props) {
  return props;
}

const booleans = ["allowfullscreen", "async", "alpha",
"autofocus",
"autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden",
"indeterminate", "inert",
"ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless",
"selected", "adauctionheaders",
"browsingtopics",
"credentialless",
"defaultchecked", "defaultmuted", "defaultselected", "defer", "disablepictureinpicture", "disableremoteplayback", "preservespitch",
"shadowrootclonable", "shadowrootcustomelementregistry",
"shadowrootdelegatesfocus", "shadowrootserializable",
"sharedstoragewritable"
];
const Properties = /*#__PURE__*/new Set([
"className", "value",
"readOnly", "noValidate", "formNoValidate", "isMap", "noModule", "playsInline", "adAuctionHeaders",
"allowFullscreen", "browsingTopics",
"defaultChecked", "defaultMuted", "defaultSelected", "disablePictureInPicture", "disableRemotePlayback", "preservesPitch", "shadowRootClonable", "shadowRootCustomElementRegistry",
"shadowRootDelegatesFocus", "shadowRootSerializable",
"sharedStorageWritable",
...booleans]);
const ChildProperties = /*#__PURE__*/new Set(["innerHTML", "textContent", "innerText", "children"]);
const Aliases = /*#__PURE__*/Object.assign(Object.create(null), {
  className: "class",
  htmlFor: "for"
});
const PropAliases = /*#__PURE__*/Object.assign(Object.create(null), {
  class: "className",
  novalidate: {
    $: "noValidate",
    FORM: 1
  },
  formnovalidate: {
    $: "formNoValidate",
    BUTTON: 1,
    INPUT: 1
  },
  ismap: {
    $: "isMap",
    IMG: 1
  },
  nomodule: {
    $: "noModule",
    SCRIPT: 1
  },
  playsinline: {
    $: "playsInline",
    VIDEO: 1
  },
  readonly: {
    $: "readOnly",
    INPUT: 1,
    TEXTAREA: 1
  },
  adauctionheaders: {
    $: "adAuctionHeaders",
    IFRAME: 1
  },
  allowfullscreen: {
    $: "allowFullscreen",
    IFRAME: 1
  },
  browsingtopics: {
    $: "browsingTopics",
    IMG: 1
  },
  defaultchecked: {
    $: "defaultChecked",
    INPUT: 1
  },
  defaultmuted: {
    $: "defaultMuted",
    AUDIO: 1,
    VIDEO: 1
  },
  defaultselected: {
    $: "defaultSelected",
    OPTION: 1
  },
  disablepictureinpicture: {
    $: "disablePictureInPicture",
    VIDEO: 1
  },
  disableremoteplayback: {
    $: "disableRemotePlayback",
    AUDIO: 1,
    VIDEO: 1
  },
  preservespitch: {
    $: "preservesPitch",
    AUDIO: 1,
    VIDEO: 1
  },
  shadowrootclonable: {
    $: "shadowRootClonable",
    TEMPLATE: 1
  },
  shadowrootdelegatesfocus: {
    $: "shadowRootDelegatesFocus",
    TEMPLATE: 1
  },
  shadowrootserializable: {
    $: "shadowRootSerializable",
    TEMPLATE: 1
  },
  sharedstoragewritable: {
    $: "sharedStorageWritable",
    IFRAME: 1,
    IMG: 1
  }
});
function getPropAlias(prop, tagName) {
  const a = PropAliases[prop];
  return typeof a === "object" ? a[tagName] ? a["$"] : undefined : a;
}
const DelegatedEvents = /*#__PURE__*/new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
const SVGElements = /*#__PURE__*/new Set([
"altGlyph", "altGlyphDef", "altGlyphItem", "animate", "animateColor", "animateMotion", "animateTransform", "circle", "clipPath", "color-profile", "cursor", "defs", "desc", "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "filter", "font", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignObject", "g", "glyph", "glyphRef", "hkern", "image", "line", "linearGradient", "marker", "mask", "metadata", "missing-glyph", "mpath", "path", "pattern", "polygon", "polyline", "radialGradient", "rect",
"set", "stop",
"svg", "switch", "symbol", "text", "textPath",
"tref", "tspan", "use", "view", "vkern"]);
const SVGNamespace = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace"
};

const memo = fn => createMemo(() => fn());

function reconcileArrays(parentNode, a, b) {
  let bLength = b.length,
    aEnd = a.length,
    bEnd = bLength,
    aStart = 0,
    bStart = 0,
    after = a[aEnd - 1].nextSibling,
    map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
            sequence = 1,
            t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}

const $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init, options = {}) {
  let disposer;
  createRoot(dispose => {
    disposer = dispose;
    element === document ? code() : insert(element, code(), element.firstChild ? null : undefined, init);
  }, options.owner);
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, isImportNode, isSVG, isMathML) {
  let node;
  const create = () => {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content.firstChild;
  };
  const fn = () => (node || (node = create())).cloneNode(true);
  fn.cloneNode = fn;
  return fn;
}
function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}
function setAttribute(node, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute(name);else node.setAttribute(name, value);
}
function setAttributeNS(node, namespace, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttributeNS(namespace, name);else node.setAttributeNS(namespace, name, value);
}
function setBoolAttribute(node, name, value) {
  if (isHydrating(node)) return;
  value ? node.setAttribute(name, "") : node.removeAttribute(name);
}
function className(node, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute("class");else node.className = value;
}
function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, handler[0] = e => handlerFn.call(node, handler[1], e));
  } else node.addEventListener(name, handler, typeof handler !== "function" && handler);
}
function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}),
    prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key]) continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}
function style(node, value, prev) {
  if (!value) return prev ? setAttribute(node, "style") : value;
  const nodeStyle = node.style;
  if (typeof value === "string") return nodeStyle.cssText = value;
  typeof prev === "string" && (nodeStyle.cssText = prev = undefined);
  prev || (prev = {});
  value || (value = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}
function setStyleProperty(node, name, value) {
  value != null ? node.style.setProperty(name, value) : node.style.removeProperty(name);
}
function spread(node, props = {}, isSVG, skipChildren) {
  const prevProps = {};
  if (!skipChildren) {
    createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
  }
  createRenderEffect(() => typeof props.ref === "function" && use(props.ref, node));
  createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
  return prevProps;
}
function use(fn, element, arg) {
  return untrack(() => fn(element, arg));
}
function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
}
function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children") continue;
      prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef, props);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef, props);
  }
}
function getNextElement(template) {
  let node,
    key,
    hydrating = isHydrating();
  if (!hydrating || !(node = sharedConfig.registry.get(key = getHydrationKey()))) {
    return template();
  }
  if (sharedConfig.completed) sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}
function isHydrating(node) {
  return !!sharedConfig.context && true && (!node || node.isConnected);
}
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}
function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++) node.classList.toggle(classNames[i], value);
}
function assignProp(node, prop, value, prev, isSVG, skipRef, props) {
  let isCE, isProp, isChildProp, propAlias, forceProp;
  if (prop === "style") return style(node, value, prev);
  if (prop === "classList") return classList(node, value, prev);
  if (value === prev) return prev;
  if (prop === "ref") {
    if (!skipRef) value(node);
  } else if (prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev, typeof prev !== "function" && prev);
    value && node.addEventListener(e, value, typeof value !== "function" && value);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const e = prop.slice(10);
    prev && node.removeEventListener(e, prev, true);
    value && node.addEventListener(e, value, true);
  } else if (prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if (prop.slice(0, 5) === "attr:") {
    setAttribute(node, prop.slice(5), value);
  } else if (prop.slice(0, 5) === "bool:") {
    setBoolAttribute(node, prop.slice(5), value);
  } else if ((forceProp = prop.slice(0, 5) === "prop:") || (isChildProp = ChildProperties.has(prop)) || !isSVG && ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-") || "is" in props)) {
    if (forceProp) {
      prop = prop.slice(5);
      isProp = true;
    } else if (isHydrating(node)) return value;
    if (prop === "class" || prop === "className") className(node, value);else if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;else node[propAlias || prop] = value;
  } else {
    const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
    if (ns) setAttributeNS(node, ns, prop, value);else setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
}
function eventHandler(e) {
  let node = e.target;
  const key = `$$${e.type}`;
  const oriTarget = e.target;
  const oriCurrentTarget = e.currentTarget;
  const retarget = value => Object.defineProperty(e, "target", {
    configurable: true,
    value
  });
  const handleNode = () => {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node.host && typeof node.host !== "string" && !node.host._$host && node.contains(e.target) && retarget(node.host);
    return true;
  };
  const walkUpTree = () => {
    while (handleNode() && (node = node._$host || node.parentNode || node.host));
  };
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (e.composedPath) {
    const path = e.composedPath();
    retarget(path[0]);
    for (let i = 0; i < path.length - 2; i++) {
      node = path[i];
      if (!handleNode()) break;
      if (node._$host) {
        node = node._$host;
        walkUpTree();
        break;
      }
      if (node.parentNode === oriCurrentTarget) {
        break;
      }
    }
  }
  else walkUpTree();
  retarget(oriTarget);
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  const hydrating = isHydrating(parent);
  if (hydrating) {
    !current && (current = [...parent.childNodes]);
    let cleaned = [];
    for (let i = 0; i < current.length; i++) {
      const node = current[i];
      if (node.nodeType === 8 && node.data.slice(0, 2) === "!$") node.remove();else cleaned.push(node);
    }
    current = cleaned;
  }
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value,
    multi = marker !== undefined;
  parent = multi && current[0] && current[0].parentNode || parent;
  if (t === "string" || t === "number") {
    if (hydrating) return current;
    if (t === "number") {
      value = value.toString();
      if (value === current) return current;
    }
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data !== value && (node.data = value);
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (hydrating) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (hydrating) {
      if (!array.length) return current;
      if (marker === undefined) return current = [...parent.childNodes];
      let node = array[0];
      if (node.parentNode !== parent) return current;
      const nodes = [node];
      while ((node = node.nextSibling) !== marker) nodes.push(node);
      return current = nodes;
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value.nodeType) {
    if (hydrating && value.parentNode) return current = multi ? [value] : value;
    if (Array.isArray(current)) {
      if (multi) return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else ;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
      prev = current && current[normalized.length],
      t;
    if (item == null || item === true || item === false) ; else if ((t = typeof item) === "object" && item.nodeType) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);else normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return parent.textContent = "";
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}
function getHydrationKey() {
  return sharedConfig.getNextContextId();
}
const voidFn = () => undefined;

const isServer = false;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
function createElement(tagName, isSVG = false, is = undefined) {
  return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName, {
    is
  });
}
function createDynamic(component, props) {
  const cached = createMemo(component);
  return createMemo(() => {
    const component = cached();
    switch (typeof component) {
      case "function":
        return untrack(() => component(props));
      case "string":
        const isSvg = SVGElements.has(component);
        const el = sharedConfig.context ? getNextElement() : createElement(component, isSvg, untrack(() => props.is));
        spread(el, props, isSvg);
        return el;
    }
  });
}
function Dynamic$1(props) {
  const [, others] = splitProps(props, ["component"]);
  return createDynamic(() => props.component, others);
}

const $RAW = Symbol("store-raw"),
  $NODE = Symbol("store-node"),
  $HAS = Symbol("store-has"),
  $SELF = Symbol("store-self");
function wrap$1(value) {
  let p = value[$PROXY];
  if (!p) {
    Object.defineProperty(value, $PROXY, {
      value: p = new Proxy(value, proxyTraps$1)
    });
    if (!Array.isArray(value)) {
      const keys = Object.keys(value),
        desc = Object.getOwnPropertyDescriptors(value);
      for (let i = 0, l = keys.length; i < l; i++) {
        const prop = keys[i];
        if (desc[prop].get) {
          Object.defineProperty(value, prop, {
            enumerable: desc[prop].enumerable,
            get: desc[prop].get.bind(p)
          });
        }
      }
    }
  }
  return p;
}
function isWrappable(obj) {
  let proto;
  return obj != null && typeof obj === "object" && (obj[$PROXY] || !(proto = Object.getPrototypeOf(obj)) || proto === Object.prototype || Array.isArray(obj));
}
function unwrap(item, set = new Set()) {
  let result, unwrapped, v, prop;
  if (result = item != null && item[$RAW]) return result;
  if (!isWrappable(item) || set.has(item)) return item;
  if (Array.isArray(item)) {
    if (Object.isFrozen(item)) item = item.slice(0);else set.add(item);
    for (let i = 0, l = item.length; i < l; i++) {
      v = item[i];
      if ((unwrapped = unwrap(v, set)) !== v) item[i] = unwrapped;
    }
  } else {
    if (Object.isFrozen(item)) item = Object.assign({}, item);else set.add(item);
    const keys = Object.keys(item),
      desc = Object.getOwnPropertyDescriptors(item);
    for (let i = 0, l = keys.length; i < l; i++) {
      prop = keys[i];
      if (desc[prop].get) continue;
      v = item[prop];
      if ((unwrapped = unwrap(v, set)) !== v) item[prop] = unwrapped;
    }
  }
  return item;
}
function getNodes(target, symbol) {
  let nodes = target[symbol];
  if (!nodes) Object.defineProperty(target, symbol, {
    value: nodes = Object.create(null)
  });
  return nodes;
}
function getNode(nodes, property, value) {
  if (nodes[property]) return nodes[property];
  const [s, set] = createSignal(value, {
    equals: false,
    internal: true
  });
  s.$ = set;
  return nodes[property] = s;
}
function proxyDescriptor$1(target, property) {
  const desc = Reflect.getOwnPropertyDescriptor(target, property);
  if (!desc || desc.get || !desc.configurable || property === $PROXY || property === $NODE) return desc;
  delete desc.value;
  delete desc.writable;
  desc.get = () => target[$PROXY][property];
  return desc;
}
function trackSelf(target) {
  getListener() && getNode(getNodes(target, $NODE), $SELF)();
}
function ownKeys(target) {
  trackSelf(target);
  return Reflect.ownKeys(target);
}
const proxyTraps$1 = {
  get(target, property, receiver) {
    if (property === $RAW) return target;
    if (property === $PROXY) return receiver;
    if (property === $TRACK) {
      trackSelf(target);
      return receiver;
    }
    const nodes = getNodes(target, $NODE);
    const tracked = nodes[property];
    let value = tracked ? tracked() : target[property];
    if (property === $NODE || property === $HAS || property === "__proto__") return value;
    if (!tracked) {
      const desc = Object.getOwnPropertyDescriptor(target, property);
      if (getListener() && (typeof value !== "function" || target.hasOwnProperty(property)) && !(desc && desc.get)) value = getNode(nodes, property, value)();
    }
    return isWrappable(value) ? wrap$1(value) : value;
  },
  has(target, property) {
    if (property === $RAW || property === $PROXY || property === $TRACK || property === $NODE || property === $HAS || property === "__proto__") return true;
    getListener() && getNode(getNodes(target, $HAS), property)();
    return property in target;
  },
  set() {
    return true;
  },
  deleteProperty() {
    return true;
  },
  ownKeys: ownKeys,
  getOwnPropertyDescriptor: proxyDescriptor$1
};
function setProperty(state, property, value, deleting = false) {
  if (!deleting && state[property] === value) return;
  const prev = state[property],
    len = state.length;
  if (value === undefined) {
    delete state[property];
    if (state[$HAS] && state[$HAS][property] && prev !== undefined) state[$HAS][property].$();
  } else {
    state[property] = value;
    if (state[$HAS] && state[$HAS][property] && prev === undefined) state[$HAS][property].$();
  }
  let nodes = getNodes(state, $NODE),
    node;
  if (node = getNode(nodes, property, prev)) node.$(() => value);
  if (Array.isArray(state) && state.length !== len) {
    for (let i = state.length; i < len; i++) (node = nodes[i]) && node.$();
    (node = getNode(nodes, "length", len)) && node.$(state.length);
  }
  (node = nodes[$SELF]) && node.$();
}
function mergeStoreNode(state, value) {
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    setProperty(state, key, value[key]);
  }
}
function updateArray(current, next) {
  if (typeof next === "function") next = next(current);
  next = unwrap(next);
  if (Array.isArray(next)) {
    if (current === next) return;
    let i = 0,
      len = next.length;
    for (; i < len; i++) {
      const value = next[i];
      if (current[i] !== value) setProperty(current, i, value);
    }
    setProperty(current, "length", len);
  } else mergeStoreNode(current, next);
}
function updatePath(current, path, traversed = []) {
  let part,
    prev = current;
  if (path.length > 1) {
    part = path.shift();
    const partType = typeof part,
      isArray = Array.isArray(current);
    if (Array.isArray(part)) {
      for (let i = 0; i < part.length; i++) {
        updatePath(current, [part[i]].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "function") {
      for (let i = 0; i < current.length; i++) {
        if (part(current[i], i)) updatePath(current, [i].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "object") {
      const {
        from = 0,
        to = current.length - 1,
        by = 1
      } = part;
      for (let i = from; i <= to; i += by) {
        updatePath(current, [i].concat(path), traversed);
      }
      return;
    } else if (path.length > 1) {
      updatePath(current[part], path, [part].concat(traversed));
      return;
    }
    prev = current[part];
    traversed = [part].concat(traversed);
  }
  let value = path[0];
  if (typeof value === "function") {
    value = value(prev, traversed);
    if (value === prev) return;
  }
  if (part === undefined && value == undefined) return;
  value = unwrap(value);
  if (part === undefined || isWrappable(prev) && isWrappable(value) && !Array.isArray(value)) {
    mergeStoreNode(prev, value);
  } else setProperty(current, part, value);
}
function createStore(...[store, options]) {
  const unwrappedStore = unwrap(store || {});
  const isArray = Array.isArray(unwrappedStore);
  const wrappedStore = wrap$1(unwrappedStore);
  function setStore(...args) {
    batch(() => {
      isArray && args.length === 1 ? updateArray(unwrappedStore, args[0]) : updatePath(unwrappedStore, args);
    });
  }
  return [wrappedStore, setStore];
}

const $ROOT = Symbol("store-root");
function applyState(target, parent, property, merge, key) {
  const previous = parent[property];
  if (target === previous) return;
  const isArray = Array.isArray(target);
  if (property !== $ROOT && (!isWrappable(target) || !isWrappable(previous) || isArray !== Array.isArray(previous) || key && target[key] !== previous[key])) {
    setProperty(parent, property, target);
    return;
  }
  if (isArray) {
    if (target.length && previous.length && (!merge || key && target[0] && target[0][key] != null)) {
      let i, j, start, end, newEnd, item, newIndicesNext, keyVal;
      for (start = 0, end = Math.min(previous.length, target.length); start < end && (previous[start] === target[start] || key && previous[start] && target[start] && previous[start][key] && previous[start][key] === target[start][key]); start++) {
        applyState(target[start], previous, start, merge, key);
      }
      const temp = new Array(target.length),
        newIndices = new Map();
      for (end = previous.length - 1, newEnd = target.length - 1; end >= start && newEnd >= start && (previous[end] === target[newEnd] || key && previous[end] && target[newEnd] && previous[end][key] && previous[end][key] === target[newEnd][key]); end--, newEnd--) {
        temp[newEnd] = previous[end];
      }
      if (start > newEnd || start > end) {
        for (j = start; j <= newEnd; j++) setProperty(previous, j, target[j]);
        for (; j < target.length; j++) {
          setProperty(previous, j, temp[j]);
          applyState(target[j], previous, j, merge, key);
        }
        if (previous.length > target.length) setProperty(previous, "length", target.length);
        return;
      }
      newIndicesNext = new Array(newEnd + 1);
      for (j = newEnd; j >= start; j--) {
        item = target[j];
        keyVal = key && item ? item[key] : item;
        i = newIndices.get(keyVal);
        newIndicesNext[j] = i === undefined ? -1 : i;
        newIndices.set(keyVal, j);
      }
      for (i = start; i <= end; i++) {
        item = previous[i];
        keyVal = key && item ? item[key] : item;
        j = newIndices.get(keyVal);
        if (j !== undefined && j !== -1) {
          temp[j] = previous[i];
          j = newIndicesNext[j];
          newIndices.set(keyVal, j);
        }
      }
      for (j = start; j < target.length; j++) {
        if (j in temp) {
          setProperty(previous, j, temp[j]);
          applyState(target[j], previous, j, merge, key);
        } else setProperty(previous, j, target[j]);
      }
    } else {
      for (let i = 0, len = target.length; i < len; i++) {
        applyState(target[i], previous, i, merge, key);
      }
    }
    if (previous.length > target.length) setProperty(previous, "length", target.length);
    return;
  }
  const targetKeys = Object.keys(target);
  for (let i = 0, len = targetKeys.length; i < len; i++) {
    applyState(target[targetKeys[i]], previous, targetKeys[i], merge, key);
  }
  const previousKeys = Object.keys(previous);
  for (let i = 0, len = previousKeys.length; i < len; i++) {
    if (target[previousKeys[i]] === undefined) setProperty(previous, previousKeys[i], undefined);
  }
}
function reconcile(value, options = {}) {
  const {
      merge,
      key = "id"
    } = options,
    v = unwrap(value);
  return state => {
    if (!isWrappable(state) || !isWrappable(v)) return v;
    const res = applyState(v, {
      [$ROOT]: state
    }, $ROOT, merge, key);
    return res === undefined ? state : res;
  };
}
const producers = new WeakMap();
const setterTraps = {
  get(target, property) {
    if (property === $RAW) return target;
    const value = target[property];
    let proxy;
    return isWrappable(value) ? producers.get(value) || (producers.set(value, proxy = new Proxy(value, setterTraps)), proxy) : value;
  },
  set(target, property, value) {
    setProperty(target, property, unwrap(value));
    return true;
  },
  deleteProperty(target, property) {
    setProperty(target, property, undefined, true);
    return true;
  }
};
function produce(fn) {
  return state => {
    if (isWrappable(state)) {
      let proxy;
      if (!(proxy = producers.get(state))) {
        producers.set(state, proxy = new Proxy(state, setterTraps));
      }
      fn(proxy);
    }
    return state;
  };
}

function makePersisted(signal, options = {}) {
    const storage = options.storage || globalThis.localStorage;
    const name = options.name || `storage-${createUniqueId()}`;
    if (!storage) {
        return [signal[0], signal[1], null];
    }
    const storageOptions = options.storageOptions;
    const serialize = options.serialize || JSON.stringify.bind(JSON);
    const deserialize = options.deserialize || JSON.parse.bind(JSON);
    const init = storage.getItem(name, storageOptions);
    const set = typeof signal[0] === "function"
        ? (data) => {
            try {
                const value = deserialize(data);
                signal[1](() => value);
            }
            catch (e) {
            }
        }
        : (data) => {
            try {
                const value = deserialize(data);
                signal[1](reconcile(value));
            }
            catch (e) {
            }
        };
    let unchanged = true;
    if (init instanceof Promise)
        init.then(data => unchanged && data && set(data));
    else if (init)
        set(init);
    if (typeof options.sync?.[0] === "function") {
        const get = typeof signal[0] === "function" ? signal[0] : () => signal[0];
        options.sync[0]((data) => {
            if (data.key !== name ||
                ((data.url || globalThis.location.href) !== globalThis.location.href) ||
                data.newValue === serialize(untrack(get))) {
                return;
            }
            set(data.newValue);
        });
    }
    return [
        signal[0],
        typeof signal[0] === "function"
            ? (value) => {
                const output = signal[1](value);
                const serialized = value != null ? serialize(output) : value;
                options.sync?.[1](name, serialized);
                if (serialized != null)
                    storage.setItem(name, serialized, storageOptions);
                else
                    storage.removeItem(name, storageOptions);
                unchanged = false;
                return output;
            }
            : (...args) => {
                signal[1](...args);
                const value = serialize(untrack(() => signal[0]));
                options.sync?.[1](name, value);
                storage.setItem(name, value, storageOptions);
                unchanged = false;
            },
        init,
    ];
}

function createBeforeLeave() {
    let listeners = new Set();
    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
    let ignore = false;
    function confirm(to, options) {
        if (ignore)
            return !(ignore = false);
        const e = {
            to,
            options,
            defaultPrevented: false,
            preventDefault: () => (e.defaultPrevented = true)
        };
        for (const l of listeners)
            l.listener({
                ...e,
                from: l.location,
                retry: (force) => {
                    force && (ignore = true);
                    l.navigate(to, { ...options, resolve: false });
                }
            });
        return !e.defaultPrevented;
    }
    return {
        subscribe,
        confirm
    };
}
// The following supports browser initiated blocking (eg back/forward)
let depth;
function saveCurrentDepth() {
    if (!window.history.state || window.history.state._depth == null) {
        window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, "");
    }
    depth = window.history.state._depth;
}
{
    saveCurrentDepth();
}
function keepDepth(state) {
    return {
        ...state,
        _depth: window.history.state && window.history.state._depth
    };
}
function notifyIfNotBlocked(notify, block) {
    let ignore = false;
    return () => {
        const prevDepth = depth;
        saveCurrentDepth();
        const delta = prevDepth == null ? null : depth - prevDepth;
        if (ignore) {
            ignore = false;
            return;
        }
        if (delta && block(delta)) {
            ignore = true;
            window.history.go(-delta);
        }
        else {
            notify();
        }
    };
}

const hasSchemeRegex = /^(?:[a-z0-9]+:)?\/\//i;
const trimPathRegex = /^\/+|(\/)\/+$/g;
const mockBase = "http://sr";
function normalizePath(path, omitSlash = false) {
    const s = path.replace(trimPathRegex, "$1");
    return s ? (omitSlash || /^[?#]/.test(s) ? s : "/" + s) : "";
}
function resolvePath(base, path, from) {
    if (hasSchemeRegex.test(path)) {
        return undefined;
    }
    const basePath = normalizePath(base);
    const fromPath = from && normalizePath(from);
    let result = "";
    if (!fromPath || path.startsWith("/")) {
        result = basePath;
    }
    else if (fromPath.toLowerCase().indexOf(basePath.toLowerCase()) !== 0) {
        result = basePath + fromPath;
    }
    else {
        result = fromPath;
    }
    return (result || "/") + normalizePath(path, !result);
}
function invariant(value, message) {
    if (value == null) {
        throw new Error(message);
    }
    return value;
}
function joinPaths(from, to) {
    return normalizePath(from).replace(/\/*(\*.*)?$/g, "") + normalizePath(to);
}
function extractSearchParams(url) {
    const params = {};
    url.searchParams.forEach((value, key) => {
        if (key in params) {
            if (Array.isArray(params[key]))
                params[key].push(value);
            else
                params[key] = [params[key], value];
        }
        else
            params[key] = value;
    });
    return params;
}
function createMatcher(path, partial, matchFilters) {
    const [pattern, splat] = path.split("/*", 2);
    const segments = pattern.split("/").filter(Boolean);
    const len = segments.length;
    return (location) => {
        const locSegments = location.split("/").filter(Boolean);
        const lenDiff = locSegments.length - len;
        if (lenDiff < 0 || (lenDiff > 0 && splat === undefined && !partial)) {
            return null;
        }
        const match = {
            path: len ? "" : "/",
            params: {}
        };
        const matchFilter = (s) => matchFilters === undefined ? undefined : matchFilters[s];
        for (let i = 0; i < len; i++) {
            const segment = segments[i];
            const dynamic = segment[0] === ":";
            const locSegment = dynamic ? locSegments[i] : locSegments[i].toLowerCase();
            const key = dynamic ? segment.slice(1) : segment.toLowerCase();
            if (dynamic && matchSegment(locSegment, matchFilter(key))) {
                match.params[key] = locSegment;
            }
            else if (dynamic || !matchSegment(locSegment, key)) {
                return null;
            }
            match.path += `/${locSegment}`;
        }
        if (splat) {
            const remainder = lenDiff ? locSegments.slice(-lenDiff).join("/") : "";
            if (matchSegment(remainder, matchFilter(splat))) {
                match.params[splat] = remainder;
            }
            else {
                return null;
            }
        }
        return match;
    };
}
function matchSegment(input, filter) {
    const isEqual = (s) => s === input;
    if (filter === undefined) {
        return true;
    }
    else if (typeof filter === "string") {
        return isEqual(filter);
    }
    else if (typeof filter === "function") {
        return filter(input);
    }
    else if (Array.isArray(filter)) {
        return filter.some(isEqual);
    }
    else if (filter instanceof RegExp) {
        return filter.test(input);
    }
    return false;
}
function scoreRoute(route) {
    const [pattern, splat] = route.pattern.split("/*", 2);
    const segments = pattern.split("/").filter(Boolean);
    return segments.reduce((score, segment) => score + (segment.startsWith(":") ? 2 : 3), segments.length - (splat === undefined ? 0 : 1));
}
function createMemoObject(fn) {
    const map = new Map();
    const owner = getOwner();
    return new Proxy({}, {
        get(_, property) {
            if (!map.has(property)) {
                runWithOwner(owner, () => map.set(property, createMemo(() => fn()[property])));
            }
            return map.get(property)();
        },
        getOwnPropertyDescriptor() {
            return {
                enumerable: true,
                configurable: true
            };
        },
        ownKeys() {
            return Reflect.ownKeys(fn());
        },
        has(_, property) {
            return property in fn();
        }
    });
}
function expandOptionals(pattern) {
    let match = /(\/?\:[^\/]+)\?/.exec(pattern);
    if (!match)
        return [pattern];
    let prefix = pattern.slice(0, match.index);
    let suffix = pattern.slice(match.index + match[0].length);
    const prefixes = [prefix, (prefix += match[1])];
    // This section handles adjacent optional params. We don't actually want all permuations since
    // that will lead to equivalent routes which have the same number of params. For example
    // `/:a?/:b?/:c`? only has the unique expansion: `/`, `/:a`, `/:a/:b`, `/:a/:b/:c` and we can
    // discard `/:b`, `/:c`, `/:b/:c` by building them up in order and not recursing. This also helps
    // ensure predictability where earlier params have precidence.
    while ((match = /^(\/\:[^\/]+)\?/.exec(suffix))) {
        prefixes.push((prefix += match[1]));
        suffix = suffix.slice(match[0].length);
    }
    return expandOptionals(suffix).reduce((results, expansion) => [...results, ...prefixes.map(p => p + expansion)], []);
}

const MAX_REDIRECTS = 100;
const RouterContextObj = createContext();
const RouteContextObj = createContext();
const useRouter = () => invariant(useContext(RouterContextObj), "<A> and 'use' router primitives can be only used inside a Route.");
const useRoute = () => useContext(RouteContextObj) || useRouter().base;
const useResolvedPath = (path) => {
    const route = useRoute();
    return createMemo(() => route.resolvePath(path()));
};
const useHref = (to) => {
    const router = useRouter();
    return createMemo(() => {
        const to_ = to();
        return to_ !== undefined ? router.renderPath(to_) : to_;
    });
};
/**
 * Retrieves method to do navigation. The method accepts a path to navigate to and an optional object with the following options:
 *
 * - resolve (*boolean*, default `true`): resolve the path against the current route
 * - replace (*boolean*, default `false`): replace the history entry
 * - scroll (*boolean*, default `true`): scroll to top after navigation
 * - state (*any*, default `undefined`): pass custom state to `location.state`
 *
 * **Note**: The state is serialized using the structured clone algorithm which does not support all object types.
 *
 * @example
 * ```js
 * const navigate = useNavigate();
 *
 * if (unauthorized) {
 *   navigate("/login", { replace: true });
 * }
 * ```
 */
const useNavigate = () => useRouter().navigatorFactory();
/**
 * Retrieves reactive `location` object useful for getting things like `pathname`.
 *
 * @example
 * ```js
 * const location = useLocation();
 *
 * const pathname = createMemo(() => parsePath(location.pathname));
 * ```
 */
const useLocation = () => useRouter().location;
/**
 * useBeforeLeave takes a function that will be called prior to leaving a route.
 * The function will be called with:
 *
 * - from (*Location*): current location (before change).
 * - to (*string | number*): path passed to `navigate`.
 * - options (*NavigateOptions*): options passed to navigate.
 * - preventDefault (*function*): call to block the route change.
 * - defaultPrevented (*readonly boolean*): `true` if any previously called leave handlers called `preventDefault`.
 * - retry (*function*, force?: boolean ): call to retry the same navigation, perhaps after confirming with the user. Pass `true` to skip running the leave handlers again (i.e. force navigate without confirming).
 *
 * @example
 * ```js
 * useBeforeLeave((e: BeforeLeaveEventArgs) => {
 *   if (form.isDirty && !e.defaultPrevented) {
 *     // preventDefault to block immediately and prompt user async
 *     e.preventDefault();
 *     setTimeout(() => {
 *       if (window.confirm("Discard unsaved changes - are you sure?")) {
 *         // user wants to proceed anyway so retry with force=true
 *         e.retry(true);
 *       }
 *     }, 100);
 *   }
 * });
 * ```
 */
const useBeforeLeave = (listener) => {
    const s = useRouter().beforeLeave.subscribe({
        listener,
        location: useLocation(),
        navigate: useNavigate()
    });
    onCleanup(s);
};
function createRoutes(routeDef, base = "") {
    const { component, preload, load, children, info } = routeDef;
    const isLeaf = !children || (Array.isArray(children) && !children.length);
    const shared = {
        key: routeDef,
        component,
        preload: preload || load,
        info
    };
    return asArray(routeDef.path).reduce((acc, originalPath) => {
        for (const expandedPath of expandOptionals(originalPath)) {
            const path = joinPaths(base, expandedPath);
            let pattern = isLeaf ? path : path.split("/*", 1)[0];
            pattern = pattern
                .split("/")
                .map((s) => {
                return s.startsWith(":") || s.startsWith("*") ? s : encodeURIComponent(s);
            })
                .join("/");
            acc.push({
                ...shared,
                originalPath,
                pattern,
                matcher: createMatcher(pattern, !isLeaf, routeDef.matchFilters)
            });
        }
        return acc;
    }, []);
}
function createBranch(routes, index = 0) {
    return {
        routes,
        score: scoreRoute(routes[routes.length - 1]) * 10000 - index,
        matcher(location) {
            const matches = [];
            for (let i = routes.length - 1; i >= 0; i--) {
                const route = routes[i];
                const match = route.matcher(location);
                if (!match) {
                    return null;
                }
                matches.unshift({
                    ...match,
                    route
                });
            }
            return matches;
        }
    };
}
function asArray(value) {
    return Array.isArray(value) ? value : [value];
}
function createBranches(routeDef, base = "", stack = [], branches = []) {
    const routeDefs = asArray(routeDef);
    for (let i = 0, len = routeDefs.length; i < len; i++) {
        const def = routeDefs[i];
        if (def && typeof def === "object") {
            if (!def.hasOwnProperty("path"))
                def.path = "";
            const routes = createRoutes(def, base);
            for (const route of routes) {
                stack.push(route);
                const isEmptyArray = Array.isArray(def.children) && def.children.length === 0;
                if (def.children && !isEmptyArray) {
                    createBranches(def.children, route.pattern, stack, branches);
                }
                else {
                    const branch = createBranch([...stack], branches.length);
                    branches.push(branch);
                }
                stack.pop();
            }
        }
    }
    // Stack will be empty on final return
    return stack.length ? branches : branches.sort((a, b) => b.score - a.score);
}
function getRouteMatches(branches, location) {
    for (let i = 0, len = branches.length; i < len; i++) {
        const match = branches[i].matcher(location);
        if (match) {
            return match;
        }
    }
    return [];
}
function createLocation(path, state, queryWrapper) {
    const origin = new URL(mockBase);
    const url = createMemo(prev => {
        const path_ = path();
        try {
            return new URL(path_, origin);
        }
        catch (err) {
            console.error(`Invalid path ${path_}`);
            return prev;
        }
    }, origin, {
        equals: (a, b) => a.href === b.href
    });
    const pathname = createMemo(() => url().pathname);
    const search = createMemo(() => url().search, true);
    const hash = createMemo(() => url().hash);
    const key = () => "";
    const queryFn = on(search, () => extractSearchParams(url()));
    return {
        get pathname() {
            return pathname();
        },
        get search() {
            return search();
        },
        get hash() {
            return hash();
        },
        get state() {
            return state();
        },
        get key() {
            return key();
        },
        query: queryWrapper ? queryWrapper(queryFn) : createMemoObject(queryFn)
    };
}
let intent;
function getIntent() {
    return intent;
}
function setInPreloadFn(value) {
}
function createRouterContext(integration, branches, getContext, options = {}) {
    const { signal: [source, setSource], utils = {} } = integration;
    const parsePath = utils.parsePath || (p => p);
    const renderPath = utils.renderPath || (p => p);
    const beforeLeave = utils.beforeLeave || createBeforeLeave();
    const basePath = resolvePath("", options.base || "");
    if (basePath === undefined) {
        throw new Error(`${basePath} is not a valid base path`);
    }
    else if (basePath && !source().value) {
        setSource({ value: basePath, replace: true, scroll: false });
    }
    const [isRouting, setIsRouting] = createSignal(false);
    // Keep track of last target, so that last call to transition wins
    let lastTransitionTarget;
    // Transition the location to a new value
    const transition = (newIntent, newTarget) => {
        if (newTarget.value === reference() && newTarget.state === state())
            return;
        if (lastTransitionTarget === undefined)
            setIsRouting(true);
        intent = newIntent;
        lastTransitionTarget = newTarget;
        startTransition(() => {
            if (lastTransitionTarget !== newTarget)
                return;
            setReference(lastTransitionTarget.value);
            setState(lastTransitionTarget.state);
            submissions[1](subs => subs.filter(s => s.pending));
        }).finally(() => {
            if (lastTransitionTarget !== newTarget)
                return;
            // Batch, in order for isRouting and final source update to happen together
            batch(() => {
                intent = undefined;
                if (newIntent === "navigate")
                    navigateEnd(lastTransitionTarget);
                setIsRouting(false);
                lastTransitionTarget = undefined;
            });
        });
    };
    const [reference, setReference] = createSignal(source().value);
    const [state, setState] = createSignal(source().state);
    const location = createLocation(reference, state, utils.queryWrapper);
    const referrers = [];
    const submissions = createSignal([]);
    const matches = createMemo(() => {
        if (typeof options.transformUrl === "function") {
            return getRouteMatches(branches(), options.transformUrl(location.pathname));
        }
        return getRouteMatches(branches(), location.pathname);
    });
    const buildParams = () => {
        const m = matches();
        const params = {};
        for (let i = 0; i < m.length; i++) {
            Object.assign(params, m[i].params);
        }
        return params;
    };
    const params = utils.paramsWrapper
        ? utils.paramsWrapper(buildParams, branches)
        : createMemoObject(buildParams);
    const baseRoute = {
        pattern: basePath,
        path: () => basePath,
        outlet: () => null,
        resolvePath(to) {
            return resolvePath(basePath, to);
        }
    };
    // Create a native transition, when source updates
    createRenderEffect(on(source, source => transition("native", source), { defer: true }));
    return {
        base: baseRoute,
        location,
        params,
        isRouting,
        renderPath,
        parsePath,
        navigatorFactory,
        matches,
        beforeLeave,
        preloadRoute,
        singleFlight: options.singleFlight === undefined ? true : options.singleFlight,
        submissions
    };
    function navigateFromRoute(route, to, options) {
        // Untrack in case someone navigates in an effect - don't want to track `reference` or route paths
        untrack(() => {
            if (typeof to === "number") {
                if (!to) {
                    // A delta of 0 means stay at the current location, so it is ignored
                }
                else if (utils.go) {
                    utils.go(to);
                }
                else {
                    console.warn("Router integration does not support relative routing");
                }
                return;
            }
            const queryOnly = !to || to[0] === "?";
            const { replace, resolve, scroll, state: nextState } = {
                replace: false,
                resolve: !queryOnly,
                scroll: true,
                ...options
            };
            const resolvedTo = resolve
                ? route.resolvePath(to)
                : resolvePath((queryOnly && location.pathname) || "", to);
            if (resolvedTo === undefined) {
                throw new Error(`Path '${to}' is not a routable path`);
            }
            else if (referrers.length >= MAX_REDIRECTS) {
                throw new Error("Too many redirects");
            }
            const current = reference();
            if (resolvedTo !== current || nextState !== state()) {
                if (isServer) ;
                else if (beforeLeave.confirm(resolvedTo, options)) {
                    referrers.push({ value: current, replace, scroll, state: state() });
                    transition("navigate", {
                        value: resolvedTo,
                        state: nextState
                    });
                }
            }
        });
    }
    function navigatorFactory(route) {
        // Workaround for vite issue (https://github.com/vitejs/vite/issues/3803)
        route = route || useContext(RouteContextObj) || baseRoute;
        return (to, options) => navigateFromRoute(route, to, options);
    }
    function navigateEnd(next) {
        const first = referrers[0];
        if (first) {
            setSource({
                ...next,
                replace: first.replace,
                scroll: first.scroll
            });
            referrers.length = 0;
        }
    }
    function preloadRoute(url, preloadData) {
        const matches = getRouteMatches(branches(), url.pathname);
        const prevIntent = intent;
        intent = "preload";
        for (let match in matches) {
            const { route, params } = matches[match];
            route.component &&
                route.component.preload &&
                route.component.preload();
            const { preload } = route;
            preloadData &&
                preload &&
                runWithOwner(getContext(), () => preload({
                    params,
                    location: {
                        pathname: url.pathname,
                        search: url.search,
                        hash: url.hash,
                        query: extractSearchParams(url),
                        state: null,
                        key: ""
                    },
                    intent: "preload"
                }));
        }
        intent = prevIntent;
    }
}
function createRouteContext(router, parent, outlet, match) {
    const { base, location, params } = router;
    const { pattern, component, preload } = match().route;
    const path = createMemo(() => match().path);
    component &&
        component.preload &&
        component.preload();
    const data = preload ? preload({ params, location, intent: intent || "initial" }) : undefined;
    const route = {
        parent,
        pattern,
        path,
        outlet: () => component
            ? createComponent(component, {
                params,
                location,
                data,
                get children() {
                    return outlet();
                }
            })
            : outlet(),
        resolvePath(to) {
            return resolvePath(base.path(), to, path());
        }
    };
    return route;
}

const createRouterComponent = (router) => (props) => {
  const {
    base
  } = props;
  const routeDefs = children(() => props.children);
  const branches = createMemo(() => createBranches(routeDefs(), props.base || ""));
  let context;
  const routerState = createRouterContext(router, branches, () => context, {
    base,
    singleFlight: props.singleFlight,
    transformUrl: props.transformUrl
  });
  router.create && router.create(routerState);
  return createComponent(RouterContextObj.Provider, {
    value: routerState,
    get children() {
      return createComponent(Root, {
        routerState,
        get root() {
          return props.root;
        },
        get preload() {
          return props.rootPreload || props.rootLoad;
        },
        get children() {
          return [memo(() => (context = getOwner()) && null), createComponent(Routes, {
            routerState,
            get branches() {
              return branches();
            }
          })];
        }
      });
    }
  });
};
function Root(props) {
  const location = props.routerState.location;
  const params = props.routerState.params;
  const data = createMemo(() => props.preload && untrack(() => {
    setInPreloadFn(true);
    props.preload({
      params,
      location,
      intent: getIntent() || "initial"
    });
    setInPreloadFn(false);
  }));
  return createComponent(Show, {
    get when() {
      return props.root;
    },
    keyed: true,
    get fallback() {
      return props.children;
    },
    children: (Root2) => createComponent(Root2, {
      params,
      location,
      get data() {
        return data();
      },
      get children() {
        return props.children;
      }
    })
  });
}
function Routes(props) {
  const disposers = [];
  let root;
  const routeStates = createMemo(on(props.routerState.matches, (nextMatches, prevMatches, prev) => {
    let equal = prevMatches && nextMatches.length === prevMatches.length;
    const next = [];
    for (let i = 0, len = nextMatches.length; i < len; i++) {
      const prevMatch = prevMatches && prevMatches[i];
      const nextMatch = nextMatches[i];
      if (prev && prevMatch && nextMatch.route.key === prevMatch.route.key) {
        next[i] = prev[i];
      } else {
        equal = false;
        if (disposers[i]) {
          disposers[i]();
        }
        createRoot((dispose) => {
          disposers[i] = dispose;
          next[i] = createRouteContext(props.routerState, next[i - 1] || props.routerState.base, createOutlet(() => routeStates()[i + 1]), () => {
            const routeMatches = props.routerState.matches();
            return routeMatches[i] ?? routeMatches[0];
          });
        });
      }
    }
    disposers.splice(nextMatches.length).forEach((dispose) => dispose());
    if (prev && equal) {
      return prev;
    }
    root = next[0];
    return next;
  }));
  return createOutlet(() => routeStates() && root)();
}
const createOutlet = (child) => {
  return () => createComponent(Show, {
    get when() {
      return child();
    },
    keyed: true,
    children: (child2) => createComponent(RouteContextObj.Provider, {
      value: child2,
      get children() {
        return child2.outlet();
      }
    })
  });
};
const Route = (props) => {
  const childRoutes = children(() => props.children);
  return mergeProps(props, {
    get children() {
      return childRoutes();
    }
  });
};

function intercept([value, setValue], get, set) {
    return [value, set ? (v) => setValue(set(v)) : setValue];
}
function createRouter(config) {
    let ignore = false;
    const wrap = (value) => (typeof value === "string" ? { value } : value);
    const signal = intercept(createSignal(wrap(config.get()), {
        equals: (a, b) => a.value === b.value && a.state === b.state
    }), undefined, next => {
        !ignore && config.set(next);
        return next;
    });
    config.init &&
        onCleanup(config.init((value = config.get()) => {
            ignore = true;
            signal[1](wrap(value));
            ignore = false;
        }));
    return createRouterComponent({
        signal,
        create: config.create,
        utils: config.utils
    });
}
function bindEvent(target, type, handler) {
    target.addEventListener(type, handler);
    return () => target.removeEventListener(type, handler);
}
function scrollToHash(hash, fallbackTop) {
    const el = hash && document.getElementById(hash);
    if (el) {
        el.scrollIntoView();
    }
    else if (fallbackTop) {
        window.scrollTo(0, 0);
    }
}

const actions = /* #__PURE__ */ new Map();

function setupNativeEvents(preload = true, explicitLinks = false, actionBase = "/_server", transformUrl) {
    return (router) => {
        const basePath = router.base.path();
        const navigateFromRoute = router.navigatorFactory(router.base);
        let preloadTimeout;
        let lastElement;
        function isSvg(el) {
            return el.namespaceURI === "http://www.w3.org/2000/svg";
        }
        function handleAnchor(evt) {
            if (evt.defaultPrevented ||
                evt.button !== 0 ||
                evt.metaKey ||
                evt.altKey ||
                evt.ctrlKey ||
                evt.shiftKey)
                return;
            const a = evt
                .composedPath()
                .find(el => el instanceof Node && el.nodeName.toUpperCase() === "A");
            if (!a || (explicitLinks && !a.hasAttribute("link")))
                return;
            const svg = isSvg(a);
            const href = svg ? a.href.baseVal : a.href;
            const target = svg ? a.target.baseVal : a.target;
            if (target || (!href && !a.hasAttribute("state")))
                return;
            const rel = (a.getAttribute("rel") || "").split(/\s+/);
            if (a.hasAttribute("download") || (rel && rel.includes("external")))
                return;
            const url = svg ? new URL(href, document.baseURI) : new URL(href);
            if (url.origin !== window.location.origin ||
                (basePath && url.pathname && !url.pathname.toLowerCase().startsWith(basePath.toLowerCase())))
                return;
            return [a, url];
        }
        function handleAnchorClick(evt) {
            const res = handleAnchor(evt);
            if (!res)
                return;
            const [a, url] = res;
            const to = router.parsePath(url.pathname + url.search + url.hash);
            const state = a.getAttribute("state");
            evt.preventDefault();
            navigateFromRoute(to, {
                resolve: false,
                replace: a.hasAttribute("replace"),
                scroll: !a.hasAttribute("noscroll"),
                state: state ? JSON.parse(state) : undefined
            });
        }
        function handleAnchorPreload(evt) {
            const res = handleAnchor(evt);
            if (!res)
                return;
            const [a, url] = res;
            transformUrl && (url.pathname = transformUrl(url.pathname));
            router.preloadRoute(url, a.getAttribute("preload") !== "false");
        }
        function handleAnchorMove(evt) {
            clearTimeout(preloadTimeout);
            const res = handleAnchor(evt);
            if (!res)
                return lastElement = null;
            const [a, url] = res;
            if (lastElement === a)
                return;
            transformUrl && (url.pathname = transformUrl(url.pathname));
            preloadTimeout = setTimeout(() => {
                router.preloadRoute(url, a.getAttribute("preload") !== "false");
                lastElement = a;
            }, 20);
        }
        function handleFormSubmit(evt) {
            if (evt.defaultPrevented)
                return;
            let actionRef = evt.submitter && evt.submitter.hasAttribute("formaction")
                ? evt.submitter.getAttribute("formaction")
                : evt.target.getAttribute("action");
            if (!actionRef)
                return;
            if (!actionRef.startsWith("https://action/")) {
                // normalize server actions
                const url = new URL(actionRef, mockBase);
                actionRef = router.parsePath(url.pathname + url.search);
                if (!actionRef.startsWith(actionBase))
                    return;
            }
            if (evt.target.method.toUpperCase() !== "POST")
                throw new Error("Only POST forms are supported for Actions");
            const handler = actions.get(actionRef);
            if (handler) {
                evt.preventDefault();
                const data = new FormData(evt.target, evt.submitter);
                handler.call({ r: router, f: evt.target }, evt.target.enctype === "multipart/form-data"
                    ? data
                    : new URLSearchParams(data));
            }
        }
        // ensure delegated event run first
        delegateEvents(["click", "submit"]);
        document.addEventListener("click", handleAnchorClick);
        if (preload) {
            document.addEventListener("mousemove", handleAnchorMove, { passive: true });
            document.addEventListener("focusin", handleAnchorPreload, { passive: true });
            document.addEventListener("touchstart", handleAnchorPreload, { passive: true });
        }
        document.addEventListener("submit", handleFormSubmit);
        onCleanup(() => {
            document.removeEventListener("click", handleAnchorClick);
            if (preload) {
                document.removeEventListener("mousemove", handleAnchorMove);
                document.removeEventListener("focusin", handleAnchorPreload);
                document.removeEventListener("touchstart", handleAnchorPreload);
            }
            document.removeEventListener("submit", handleFormSubmit);
        });
    };
}

function Router(props) {
    const getSource = () => {
        const url = window.location.pathname.replace(/^\/+/, "/") + window.location.search;
        const state = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? undefined : window.history.state;
        return {
            value: url + window.location.hash,
            state
        };
    };
    const beforeLeave = createBeforeLeave();
    return createRouter({
        get: getSource,
        set({ value, replace, scroll, state }) {
            if (replace) {
                window.history.replaceState(keepDepth(state), "", value);
            }
            else {
                window.history.pushState(state, "", value);
            }
            scrollToHash(decodeURIComponent(window.location.hash.slice(1)), scroll);
            saveCurrentDepth();
        },
        init: notify => bindEvent(window, "popstate", notifyIfNotBlocked(notify, delta => {
            if (delta) {
                return !beforeLeave.confirm(delta);
            }
            else {
                const s = getSource();
                return !beforeLeave.confirm(s.value, { state: s.state });
            }
        })),
        create: setupNativeEvents(props.preload, props.explicitLinks, props.actionBase, props.transformUrl),
        utils: {
            go: delta => window.history.go(delta),
            beforeLeave
        }
    })(props);
}

var _tmpl$$8 = /* @__PURE__ */ template(`<a>`);
function A(props) {
  props = mergeProps({
    inactiveClass: "inactive",
    activeClass: "active"
  }, props);
  const [, rest] = splitProps(props, ["href", "state", "class", "activeClass", "inactiveClass", "end"]);
  const to = useResolvedPath(() => props.href);
  const href = useHref(to);
  const location = useLocation();
  const isActive = createMemo(() => {
    const to_ = to();
    if (to_ === void 0) return [false, false];
    const path = normalizePath(to_.split(/[?#]/, 1)[0]).toLowerCase();
    const loc = decodeURI(normalizePath(location.pathname).toLowerCase());
    return [props.end ? path === loc : loc.startsWith(path + "/") || loc === path, path === loc];
  });
  return (() => {
    var _el$ = _tmpl$$8();
    spread(_el$, mergeProps(rest, {
      get href() {
        return href() || props.href;
      },
      get state() {
        return JSON.stringify(props.state);
      },
      get classList() {
        return {
          ...props.class && {
            [props.class]: true
          },
          [props.inactiveClass]: !isActive()[0],
          [props.activeClass]: isActive()[0],
          ...rest.classList
        };
      },
      "link": "",
      get ["aria-current"]() {
        return isActive()[1] ? "page" : void 0;
      }
    }), false, false);
    return _el$;
  })();
}

function r(e){var t,f,n="";if("string"==typeof e||"number"==typeof e)n+=e;else if("object"==typeof e)if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(f=r(e[t]))&&(n&&(n+=" "),n+=f);}else for(f in e)e[f]&&(n&&(n+=" "),n+=f);return n}function clsx(){for(var e,t,f=0,n="",o=arguments.length;f<o;f++)(e=arguments[f])&&(t=r(e))&&(n&&(n+=" "),n+=t);return n}

const page = "_page_1algv_1";
const styles$5 = {
	page: page
};

var keyedContexts = /* @__PURE__ */ new Map();
var createKeyedContext = (key, defaultValue) => {
  if (keyedContexts.has(key)) {
    return keyedContexts.get(key);
  }
  const keyedContext = createContext(defaultValue);
  keyedContexts.set(key, keyedContext);
  return keyedContext;
};
var useKeyedContext = (key) => {
  const keyedContext = keyedContexts.get(key);
  if (!keyedContext) return void 0;
  return useContext(keyedContext);
};

var access = (v) => typeof v === "function" ? v() : v;
var chain$1 = (callbacks) => {
  return (...args) => {
    for (const callback of callbacks) callback && callback(...args);
  };
};
var mergeRefs$1 = (...refs) => {
  return chain$1(refs);
};

var createTagName = (props) => {
  const tagName = createMemo(() => access(props.element)?.tagName.toLowerCase() ?? props.fallback);
  return tagName;
};
var tagName_default = createTagName;

var isFunction = (value) => {
  return typeof value === "function" && value.length > 0;
};
var buttonInputTypes = ["button", "color", "file", "image", "reset", "submit"];
var isButton = (tagName, type) => {
  if (tagName === "button") return true;
  if (tagName === "input" && type !== void 0) {
    return buttonInputTypes.indexOf(type) !== -1;
  }
  return false;
};
var dataIf = (condition) => condition ? "" : void 0;

var Dynamic = (props) => {
  const [localProps, otherProps] = splitProps(props, ["as"]);
  const cached = createMemo(() => localProps.as ?? "div");
  const memoizedDynamic = createMemo(() => {
    const component = cached();
    switch (typeof component) {
      case "function":
        return untrack(() => component(otherProps));
      case "string":
        return createComponent(Dynamic$1, mergeProps({
          component
        }, otherProps));
    }
  });
  return memoizedDynamic;
};
var Dynamic_default = Dynamic;
var DynamicButton = (props) => {
  const [ref, setRef] = createSignal(null);
  const [localProps, otherProps] = splitProps(props, ["ref", "type"]);
  const tagName = tagName_default({
    element: ref,
    fallback: "button"
  });
  const memoizedIsButton = createMemo(() => {
    return isButton(tagName(), localProps.type);
  });
  return createComponent(Dynamic_default, mergeProps({
    as: "button",
    ref(r$) {
      var _ref$ = mergeRefs$1(setRef, localProps.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    get type() {
      return memoizedIsButton() ? "button" : void 0;
    },
    get role() {
      return !memoizedIsButton() ? "button" : void 0;
    }
  }, otherProps));
};
var DynamicButton_default = DynamicButton;

var callEventHandler = (eventHandler, event) => {
  if (eventHandler) {
    if (typeof eventHandler === "function") {
      eventHandler(event);
    } else {
      eventHandler[0](eventHandler[1], event);
    }
  }
  return event.defaultPrevented;
};

function createControllableSignal(props) {
  const [uncontrolledSignal, setUncontrolledSignal] = createSignal(props.initialValue);
  const isControlled = () => props.value?.() !== void 0;
  const value = () => isControlled() ? props.value?.() : uncontrolledSignal();
  const setValue = (next) => {
    return untrack(() => {
      let nextValue;
      if (typeof next === "function") {
        nextValue = next(value());
      } else {
        nextValue = next;
      }
      if (!Object.is(nextValue, value())) {
        if (!isControlled()) {
          setUncontrolledSignal(nextValue);
        }
        props.onChange?.(nextValue);
      }
      return nextValue;
    });
  };
  return [value, setValue];
}
var controllableSignal_default = createControllableSignal;

var createOnce = (fn) => {
  let result;
  let called = false;
  return () => {
    if (called) {
      return result;
    } else {
      called = true;
      return result = createMemo(fn);
    }
  };
};
var once_default = createOnce;

var createRegister = (props) => {
  const defaultedProps = mergeProps({
    initialRegistered: false
  }, props);
  const [isRegistered, setIsRegistered] = createSignal(defaultedProps.initialRegistered);
  const registerable = createMemo(() => {
    if (!isRegistered()) return void 0;
    return access(defaultedProps.value);
  });
  return [registerable, () => {
    setIsRegistered(true);
  }, () => {
    setIsRegistered(false);
  }];
};
var register_default = createRegister;

var CalendarContext = createContext();
var createCalendarContext = (contextId) => {
  if (contextId === void 0) return CalendarContext;
  const context = createKeyedContext(`calendar-${contextId}`);
  return context;
};
var useCalendarContext = (contextId) => {
  if (contextId === void 0) {
    const context2 = useContext(CalendarContext);
    if (!context2) {
      throw new Error("[corvu]: Calendar context not found. Make sure to wrap Calendar components in <Calendar.Root>");
    }
    return context2;
  }
  const context = useKeyedContext(`calendar-${contextId}`);
  if (!context) {
    throw new Error(`[corvu]: Calendar context with id "${contextId}" not found. Make sure to wrap Calendar components in <Calendar.Root contextId="${contextId}">`);
  }
  return context;
};
var InternalCalendarContext = createContext();
var createInternalCalendarContext = (contextId) => {
  if (contextId === void 0) return InternalCalendarContext;
  const context = createKeyedContext(`calendar-internal-${contextId}`);
  return context;
};
var useInternalCalendarContext = (contextId) => {
  if (contextId === void 0) {
    const context2 = useContext(InternalCalendarContext);
    if (!context2) {
      throw new Error("[corvu]: Calendar context not found. Make sure to wrap Calendar components in <Calendar.Root>");
    }
    return context2;
  }
  const context = useKeyedContext(`calendar-internal-${contextId}`);
  if (!context) {
    throw new Error(`[corvu]: Calendar context with id "${contextId}" not found. Make sure to wrap Calendar components in <Calendar.Root contextId="${contextId}">`);
  }
  return context;
};
var CalendarCell = (props) => {
  return createComponent(Dynamic_default, mergeProps({
    as: "td",
    role: "presentation",
    "data-corvu-calendar-cell": ""
  }, props));
};
var Cell_default = CalendarCell;
var isSameDay$1 = (a, b) => {
  if (!a || !b) return false;
  if (a.getDate() !== b.getDate()) return false;
  if (a.getMonth() !== b.getMonth()) return false;
  if (a.getFullYear() !== b.getFullYear()) return false;
  return true;
};
var isSameDayOrBefore$1 = (a, b) => {
  if (!a || !b) return false;
  if (isSameDay$1(a, b)) return true;
  if (a.getTime() < b.getTime()) return true;
  return false;
};
var isSameDayOrAfter = (a, b) => {
  if (!a || !b) return false;
  if (isSameDay$1(a, b)) return true;
  if (a.getTime() > b.getTime()) return true;
  return false;
};
var modifyDate = (date, modify) => {
  const newYear = date.getFullYear() + (modify.year ?? 0);
  const newMonth = date.getMonth() + (modify.month ?? 0);
  let newDay = date.getDate() + (modify.day ?? 0);
  if (modify.month !== void 0 && modify.month !== 0) {
    newDay = Math.min(new Date(newYear, newMonth + 1, 0).getDate(), newDay);
  }
  return new Date(newYear, newMonth, newDay);
};
var modifyFocusedDay = (date, modify, disabled, retry = true, iteration = 0) => {
  if (iteration > 365) return null;
  const newDate = modifyDate(date, modify);
  if (!disabled(newDate)) return newDate;
  if (!retry) return null;
  return modifyFocusedDay(newDate, modify, disabled, retry, iteration + 1);
};
var dayIsInMonth = (focusedDay, month, numberOfMonths) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + numberOfMonths, 0);
  return focusedDay.getTime() >= firstDay.getTime() && focusedDay.getTime() <= lastDay.getTime();
};
var findAvailableDayInMonth = (start, disabled) => {
  const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const month = start.getMonth();
  let shift = 0;
  const maxShift = Math.max(start.getDate() - 1, lastDayOfMonth.getDate() - start.getDate());
  while (shift <= maxShift) {
    start.setDate(start.getDate() + shift);
    if (start.getMonth() === month && !disabled(start)) return start;
    start.setDate(start.getDate() - shift);
    if (start.getMonth() === month && !disabled(start)) return start;
    shift++;
  }
  return start;
};
var CalendarCellTrigger = (props) => {
  const [localProps, otherProps] = splitProps(props, ["day", "month", "contextId", "ref", "onClick", "onKeyDown", "disabled"]);
  const [ref, setRef] = createSignal(null);
  const [isToday, setIsToday] = createSignal(false);
  createEffect(() => setIsToday(isSameDay$1(localProps.day, /* @__PURE__ */ new Date())));
  const context = createMemo(() => useInternalCalendarContext(localProps.contextId));
  createEffect(on([context().focusedDay, () => localProps.day, () => localProps.month], ([focusedDay, day, month]) => {
    if (!context().isFocusing()) return;
    if (context().isDisabled(day, month)) return;
    if (isSameDay$1(focusedDay, day)) {
      ref()?.focus();
      context().setIsFocusing(false);
    }
  }));
  createEffect(() => {
    if (context().isDisabled(localProps.day, localProps.month)) return;
    if (isSameDay$1(localProps.day, context().focusedDay())) {
      context().setFocusedDayRef(ref());
      onCleanup(() => {
        context().setFocusedDayRef(null);
      });
    }
  });
  const onClick = (e) => {
    !callEventHandler(localProps.onClick, e) && context().onDaySelect(localProps.day);
  };
  const onKeyDown = (event) => {
    if (callEventHandler(localProps.onKeyDown, event)) return;
    let focusedDay = null;
    if (event.key === "ArrowLeft" && context().textDirection() === "ltr" || event.key === "ArrowRight" && context().textDirection() === "rtl") {
      event.preventDefault();
      focusedDay = modifyFocusedDay(localProps.day, {
        day: -1
      }, context().disabled);
    } else if (event.key === "ArrowRight" && context().textDirection() === "ltr" || event.key === "ArrowLeft" && context().textDirection() === "rtl") {
      event.preventDefault();
      focusedDay = modifyFocusedDay(localProps.day, {
        day: 1
      }, context().disabled);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusedDay = modifyFocusedDay(localProps.day, {
        day: -7
      }, context().disabled);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusedDay = modifyFocusedDay(localProps.day, {
        day: 7
      }, context().disabled);
    } else if (event.key === "Home" && context().textDirection() === "ltr" || event.key === "End" && context().textDirection() === "rtl") {
      event.preventDefault();
      focusedDay = modifyFocusedDay(localProps.day, {
        day: -((localProps.day.getDay() - context().startOfWeek() + 7) % 7)
      }, context().disabled, false);
    } else if (event.key === "End" && context().textDirection() === "ltr" || event.key === "Home" && context().textDirection() === "rtl") {
      event.preventDefault();
      focusedDay = modifyFocusedDay(localProps.day, {
        day: (context().startOfWeek() + 6 - localProps.day.getDay() + 7) % 7
      }, context().disabled, false);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      if (event.shiftKey) {
        focusedDay = modifyFocusedDay(localProps.day, {
          year: -1
        }, context().disabled);
      } else {
        focusedDay = modifyFocusedDay(localProps.day, {
          month: -1
        }, context().disabled);
      }
    } else if (event.key === "PageDown") {
      event.preventDefault();
      if (event.shiftKey) {
        focusedDay = modifyFocusedDay(localProps.day, {
          year: 1
        }, context().disabled);
      } else {
        focusedDay = modifyFocusedDay(localProps.day, {
          month: 1
        }, context().disabled);
      }
    }
    if (focusedDay === null) return;
    batch(() => {
      context().setIsFocusing(true);
      context().setFocusedDay(focusedDay);
    });
  };
  return createComponent(Dynamic_default, mergeProps({
    as: "button",
    ref(r$) {
      var _ref$ = mergeRefs$1(setRef, localProps.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    onClick,
    onKeyDown,
    get disabled() {
      return localProps.disabled === true || context().isDisabled(localProps.day, localProps.month) || void 0;
    },
    role: "gridcell",
    get tabIndex() {
      return isSameDay$1(context().focusedDay(), localProps.day) ? 0 : -1;
    },
    get ["aria-selected"]() {
      return memo(() => !!context().isSelected(localProps.day))() ? "true" : !context().isDisabled(localProps.day, localProps.month) ? "false" : void 0;
    },
    get ["aria-disabled"]() {
      return context().isDisabled(localProps.day, localProps.month) ? "true" : void 0;
    },
    get ["data-selected"]() {
      return dataIf(context().isSelected(localProps.day));
    },
    get ["data-disabled"]() {
      return dataIf(context().isDisabled(localProps.day, localProps.month));
    },
    get ["data-today"]() {
      return dataIf(isToday());
    },
    get ["data-range-start"]() {
      return dataIf(context().mode() === "range" && isSameDay$1(localProps.day, context().value().from));
    },
    get ["data-range-end"]() {
      return dataIf(context().mode() === "range" && isSameDay$1(localProps.day, context().value().to));
    },
    get ["data-in-range"]() {
      return dataIf(context().mode() === "range" && isSameDayOrAfter(localProps.day, context().value().from) && isSameDayOrBefore$1(localProps.day, context().value().to));
    },
    "data-corvu-calendar-celltrigger": ""
  }, otherProps));
};
var CellTrigger_default = CalendarCellTrigger;
var CalendarHeadCell = (props) => {
  return createComponent(Dynamic_default, mergeProps({
    as: "th",
    scope: "col",
    "data-corvu-calendar-headcell": ""
  }, props));
};
var HeadCell_default = CalendarHeadCell;
var CalendarLabel = (props) => {
  const [localProps, otherProps] = splitProps(props, ["index", "contextId"]);
  const context = createMemo(() => useInternalCalendarContext(localProps.contextId));
  createEffect(() => {
    const _context = context();
    _context.registerLabelId(localProps.index ?? 0);
    onCleanup(() => _context.unregisterLabelId(localProps.index ?? 0));
  });
  return createComponent(Dynamic_default, mergeProps({
    as: "h2",
    get id() {
      return context().labelIds()[localProps.index ?? 0]?.();
    },
    "aria-live": "polite",
    "data-corvu-calendar-label": ""
  }, otherProps));
};
var Label_default = CalendarLabel;
var CalendarNav = (props) => {
  const [localProps, otherProps] = splitProps(props, ["action", "contextId", "onClick"]);
  const context = createMemo(() => useInternalCalendarContext(localProps.contextId));
  const onClick = (e) => {
    !callEventHandler(localProps.onClick, e) && context().navigate(localProps.action);
  };
  return createComponent(DynamicButton_default, mergeProps({
    onClick,
    "data-corvu-calendar-nav": ""
  }, otherProps));
};
var Nav_default = CalendarNav;
var CalendarRoot = (props) => {
  const defaultedProps = mergeProps({
    initialValue: props.mode === "single" ? null : props.mode === "multiple" ? [] : {
      from: null,
      to: null
    },
    initialMonth: props.initialFocusedDay ?? /* @__PURE__ */ new Date(),
    initialFocusedDay: findAvailableDayInMonth(props.initialMonth ?? /* @__PURE__ */ new Date(), props.disabled ?? (() => true)),
    startOfWeek: 1,
    required: false,
    disabled: () => false,
    numberOfMonths: 1,
    disableOutsideDays: true,
    fixedWeeks: false,
    textDirection: "ltr",
    labelIds: [],
    min: null,
    max: null,
    excludeDisabled: false
  }, props);
  const [value, setValue] = controllableSignal_default({
    value: () => defaultedProps.value,
    initialValue: defaultedProps.initialValue,
    onChange: props.onValueChange
  });
  const [month, setMonthInternal] = controllableSignal_default({
    value: () => defaultedProps.month,
    initialValue: defaultedProps.initialMonth,
    onChange: defaultedProps.onMonthChange
  });
  const [focusedDay, setFocusedDayInternal] = controllableSignal_default({
    value: () => defaultedProps.focusedDay,
    initialValue: defaultedProps.initialFocusedDay,
    onChange: defaultedProps.onFocusedDayChange
  });
  const registerMemo = createMemo(() => {
    const registers = Array.from({
      length: defaultedProps.numberOfMonths
    }, (_, index) => register_default({
      value: () => defaultedProps.labelIds[index] ?? createUniqueId()
    }));
    const labelIds = registers.map((register) => register[0]);
    const registerLabelId = (index) => {
      registers[index]?.[1]();
    };
    const unregisterLabelId = (index) => {
      registers[index]?.[2]();
    };
    return [labelIds, registerLabelId, unregisterLabelId];
  });
  const [focusedDayRef, setFocusedDayRef] = createSignal(null);
  const [isFocusing, setIsFocusing] = createSignal(false);
  const setMonth = (next) => {
    return untrack(() => {
      let nextValue;
      if (typeof next === "function") {
        nextValue = next(month());
      } else {
        nextValue = next;
      }
      batch(() => {
        setMonthInternal(nextValue);
        if (!dayIsInMonth(focusedDay(), nextValue, defaultedProps.numberOfMonths)) {
          setFocusedDayInternal((focusedDay2) => findAvailableDayInMonth(new Date(nextValue.getFullYear(), nextValue.getMonth(), focusedDay2.getDate()), defaultedProps.disabled));
        }
      });
      return nextValue;
    });
  };
  const setFocusedDay = (next) => {
    return untrack(() => {
      let nextValue;
      if (typeof next === "function") {
        nextValue = next(focusedDay());
      } else {
        nextValue = next;
      }
      if (defaultedProps.disabled(nextValue)) return;
      batch(() => {
        setFocusedDayInternal(nextValue);
        if (!dayIsInMonth(nextValue, month(), defaultedProps.numberOfMonths)) {
          const delta = (nextValue.getFullYear() - month().getFullYear()) * 12 + (nextValue.getMonth() - month().getMonth());
          const newMonth = new Date(month().getFullYear(), month().getMonth() + Math.sign(delta) * Math.max(defaultedProps.numberOfMonths, Math.abs(delta)));
          setMonthInternal(newMonth);
        }
      });
      return nextValue;
    });
  };
  const weekdays = () => {
    const startOfWeek = defaultedProps.startOfWeek;
    return Array.from({
      length: 7
    }, (_, i) => {
      const day = (i + startOfWeek) % 7 + 4;
      return new Date(1970, 0, day);
    });
  };
  const months = () => {
    const months2 = [];
    for (let i = 0; i < defaultedProps.numberOfMonths; i++) {
      months2.push({
        month: modifyDate(month(), {
          month: i
        }),
        weeks: weeks(i)
      });
    }
    return months2;
  };
  const weeks = (monthOffset = 0) => {
    const adjustedMonth = new Date(month().getFullYear(), month().getMonth() + monthOffset);
    const calendar = [];
    const firstDayOfMonth = new Date(adjustedMonth.getFullYear(), adjustedMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(adjustedMonth.getFullYear(), adjustedMonth.getMonth() + 1, 0);
    const prefixedDays = (firstDayOfMonth.getDay() - defaultedProps.startOfWeek + 7) % 7;
    const weekCount = defaultedProps.fixedWeeks ? 6 : Math.ceil((lastDayOfMonth.getDate() + prefixedDays) / 7);
    const currentDay = new Date(adjustedMonth.getFullYear(), adjustedMonth.getMonth(), 1 - prefixedDays);
    for (let i = 0; i < weekCount; i++) {
      const week = [];
      for (let i2 = 0; i2 < 7; i2++) {
        week.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
      calendar.push(week);
    }
    return calendar;
  };
  const navigate = (action) => {
    if (typeof action === "function") {
      const newDate = action(month());
      setMonth(newDate);
      return;
    }
    switch (action) {
      case "prev-month":
        setMonth((month2) => modifyDate(month2, {
          month: -1
        }));
        break;
      case "next-month":
        setMonth((month2) => modifyDate(month2, {
          month: 1
        }));
        break;
      case "prev-year":
        setMonth((month2) => modifyDate(month2, {
          year: -1
        }));
        break;
      case "next-year":
        setMonth((month2) => modifyDate(month2, {
          year: 1
        }));
        break;
    }
  };
  const onDaySelect = (day) => {
    setFocusedDay(day);
    switch (defaultedProps.mode) {
      case "single":
        setValue((value2) => {
          if (isSameDay$1(day, value2) && !defaultedProps.required) {
            return null;
          } else {
            return day;
          }
        });
        break;
      case "multiple":
        setValue((value2) => {
          value2 = value2;
          const isSelected2 = value2.some((d) => isSameDay$1(day, d));
          if (isSelected2 && value2.length !== defaultedProps.min && !(value2.length === 1 && defaultedProps.required)) {
            return value2.filter((d) => !isSameDay$1(day, d));
          }
          if (!isSelected2 && value2.length !== defaultedProps.max) {
            return [...value2, day];
          }
          return value2;
        });
        break;
      case "range":
        setValue((value2) => {
          value2 = value2;
          if (value2.from === null) {
            return {
              from: day,
              to: null
            };
          }
          if (value2.to === null) {
            let from = value2.from;
            let to = day;
            if (day < from) {
              to = from;
              from = day;
            }
            if (defaultedProps.excludeDisabled) {
              for (let day2 = new Date(from); day2 < to; day2.setDate(day2.getDate() + 1)) {
                if (defaultedProps.disabled(day2)) {
                  return {
                    from: day2,
                    to: null
                  };
                }
              }
            }
            return {
              from,
              to
            };
          }
          if (isSameDay$1(day, value2.from) && !defaultedProps.required) {
            return {
              from: null,
              to: null
            };
          }
          return {
            from: day,
            to: null
          };
        });
        break;
    }
  };
  const isSelected = (day) => {
    let _value = value();
    switch (defaultedProps.mode) {
      case "single":
        return isSameDay$1(day, _value);
      case "multiple":
        return _value.some((value2) => isSameDay$1(day, value2));
      case "range":
        _value = _value;
        return isSameDay$1(day, _value.from) || isSameDayOrAfter(day, _value.from) && isSameDayOrBefore$1(day, _value.to);
    }
  };
  const isDisabled = (day, _month) => {
    _month = _month ?? month();
    if (defaultedProps.disableOutsideDays && day.getMonth() !== _month.getMonth()) {
      return true;
    }
    return defaultedProps.disabled(day);
  };
  const childrenProps = {
    get mode() {
      return defaultedProps.mode;
    },
    get value() {
      return value();
    },
    // @ts-expect-error: Union type shenanigans
    setValue,
    get month() {
      return month();
    },
    setMonth,
    get focusedDay() {
      return focusedDay();
    },
    setFocusedDay,
    get startOfWeek() {
      return defaultedProps.startOfWeek;
    },
    get required() {
      return defaultedProps.required;
    },
    get numberOfMonths() {
      return defaultedProps.numberOfMonths;
    },
    get disableOutsideDays() {
      return defaultedProps.disableOutsideDays;
    },
    get fixedWeeks() {
      return defaultedProps.fixedWeeks;
    },
    get textDirection() {
      return defaultedProps.textDirection;
    },
    get weekdays() {
      return weekdays();
    },
    get months() {
      return months();
    },
    get weeks() {
      return weeks();
    },
    navigate,
    get focusedDayRef() {
      return focusedDayRef();
    },
    get min() {
      return defaultedProps.min;
    },
    get max() {
      return defaultedProps.max;
    },
    get excludeDisabled() {
      return defaultedProps.excludeDisabled;
    },
    get labelIds() {
      return registerMemo()[0].map((labelId) => labelId());
    }
  };
  const memoizedChildren = once_default(() => defaultedProps.children);
  const resolveChildren = () => {
    const children = memoizedChildren()();
    if (isFunction(children)) {
      return children(childrenProps);
    }
    return children;
  };
  const memoizedCalendarRoot = createMemo(() => {
    const CalendarContext2 = createCalendarContext(defaultedProps.contextId);
    const InternalCalendarContext2 = createInternalCalendarContext(defaultedProps.contextId);
    return createComponent(CalendarContext2.Provider, {
      value: {
        // @ts-expect-error: Union type shenanigans
        mode: () => defaultedProps.mode,
        // @ts-expect-error: Union type shenanigans
        value,
        // @ts-expect-error: Union type shenanigans
        setValue,
        month,
        setMonth,
        focusedDay,
        setFocusedDay,
        startOfWeek: () => defaultedProps.startOfWeek,
        required: () => defaultedProps.required,
        numberOfMonths: () => defaultedProps.numberOfMonths,
        disableOutsideDays: () => defaultedProps.disableOutsideDays,
        fixedWeeks: () => defaultedProps.fixedWeeks,
        textDirection: () => defaultedProps.textDirection,
        weekdays,
        months,
        weeks,
        navigate,
        focusedDayRef,
        min: () => defaultedProps.min,
        max: () => defaultedProps.max,
        excludeDisabled: () => defaultedProps.excludeDisabled,
        labelIds: () => registerMemo()[0]
      },
      get children() {
        return createComponent(InternalCalendarContext2.Provider, {
          get value() {
            return {
              // @ts-expect-error: Union type shenanigans
              mode: () => defaultedProps.mode,
              // @ts-expect-error: Union type shenanigans
              value,
              // @ts-expect-error: Union type shenanigans
              setValue,
              month,
              setMonth,
              focusedDay,
              setFocusedDay,
              startOfWeek: () => defaultedProps.startOfWeek,
              required: () => defaultedProps.required,
              numberOfMonths: () => defaultedProps.numberOfMonths,
              disableOutsideDays: () => defaultedProps.disableOutsideDays,
              fixedWeeks: () => defaultedProps.fixedWeeks,
              textDirection: () => defaultedProps.textDirection,
              weekdays,
              months,
              weeks,
              navigate,
              focusedDayRef,
              min: () => defaultedProps.min,
              max: () => defaultedProps.max,
              excludeDisabled: () => defaultedProps.excludeDisabled,
              labelIds: () => registerMemo()[0],
              registerLabelId: (index) => registerMemo()[1](index),
              unregisterLabelId: (index) => registerMemo()[2](index),
              onDaySelect,
              isSelected,
              isDisabled,
              isFocusing,
              setIsFocusing,
              disabled: defaultedProps.disabled,
              setFocusedDayRef
            };
          },
          get children() {
            return untrack(() => resolveChildren());
          }
        });
      }
    });
  });
  return memoizedCalendarRoot;
};
var Root_default = CalendarRoot;
var CalendarTable = (props) => {
  const [localProps, otherProps] = splitProps(props, ["index", "contextId"]);
  const context = createMemo(() => useInternalCalendarContext(localProps.contextId));
  return createComponent(Dynamic_default, mergeProps({
    as: "table",
    role: "grid",
    get ["aria-labelledby"]() {
      return context().labelIds()[localProps.index ?? 0]?.();
    },
    get ["aria-multiselectable"]() {
      return context().mode() === "multiple" || context().mode() === "range" ? "true" : void 0;
    },
    "data-corvu-calendar-table": ""
  }, otherProps));
};
var Table_default = CalendarTable;
var Calendar$1 = Object.assign(Root_default, {
  Label: Label_default,
  Nav: Nav_default,
  Table: Table_default,
  HeadCell: HeadCell_default,
  Cell: Cell_default,
  CellTrigger: CellTrigger_default,
  useContext: useCalendarContext
});
var index_default = Calendar$1;

const calendarContainer = "_calendarContainer_1r3uv_1";
const calendar = "_calendar_1r3uv_1";
const indicator = "_indicator_1r3uv_79";
const today = "_today_1r3uv_112";
const past = "_past_1r3uv_117";
const styles$4 = {
	calendarContainer: calendarContainer,
	calendar: calendar,
	indicator: indicator,
	today: today,
	past: past
};

const dark = "_dark_12mss_41";
const light = "_light_12mss_63";
const theme = {
	dark: dark,
	light: light
};

const themes = Object.keys(theme);
const CirkeStoreContext = createContext();
function useCirkel() {
  const context = useContext(CirkeStoreContext);
  if (!context) {
    throw new Error("StoreContext is undefined");
  }
  return context;
}

const title = "_title_90h1q_1";
const global = {
	title: title
};

const HOUR = 1e3 * 60 * 60;
const DAY = HOUR * 24;

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  if (a.getDate() !== b.getDate()) return false;
  if (a.getMonth() !== b.getMonth()) return false;
  if (a.getFullYear() !== b.getFullYear()) return false;
  return true;
};
const isSameDayOrBefore = (a, b) => {
  if (!a || !b) return false;
  if (isSameDay(a, b)) return true;
  if (a.getTime() < b.getTime()) return true;
  return false;
};
function normalizeDate(date) {
  return new Date(Math.ceil(date.getTime() / DAY) * DAY);
}
function addDays(date, amount) {
  return new Date(date.getTime() + amount * DAY);
}
function getDayOfTheCycle(store, date) {
  let last = store.entries[store.entries.length - 1].date;
  let lastTime = last.getTime();
  const normalizedDate = normalizeDate(date).getTime();
  if (last.getTime() > normalizedDate) {
    lastTime -= Math.floor((lastTime - normalizedDate) / store.settings.cycle.cycleDuration) * store.settings.cycle.cycleDuration * DAY;
  }
  const dayOfTheCycle = (normalizedDate - lastTime) / DAY % store.settings.cycle.cycleDuration;
  return dayOfTheCycle;
}
function getDaysUntilCycleCompletes(store, date) {
  return store.settings.cycle.cycleDuration - getDayOfTheCycle(store, date);
}
function dayOfPeriod(store, date) {
  const dayOfTheCycle = getDayOfTheCycle(store, date);
  if (dayOfTheCycle > store.settings.cycle.periodDuration - 1) {
    return -1;
  }
  return dayOfTheCycle;
}
function dayOfOvulation(store, date) {
  const dayOfTheCycle = getDayOfTheCycle(store, date);
  const center = Math.floor(store.settings.cycle.cycleDuration / 2);
  const startOfOvulation = center - store.settings.cycle.ovulationDuration;
  const dayOfOvulation2 = dayOfTheCycle - startOfOvulation;
  if (dayOfOvulation2 < 0) {
    return -1;
  }
  if (dayOfOvulation2 >= store.settings.cycle.ovulationDuration) {
    return -1;
  }
  return dayOfOvulation2;
}
const ordinalRules = new Intl.PluralRules("en-US");
const cardinalRules = new Intl.PluralRules("en-US", { type: "cardinal" });
const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
function formatRelativeDay(value) {
  return rtf.format(value, "day");
}
function postfixOrdinal(value) {
  switch (ordinalRules.select(value)) {
    case "one":
      return `${value}st`;
    case "two":
      return `${value}nd`;
    case "few":
      return `${value}rd`;
    case "other":
      return `${value}th`;
  }
}
function postfixCardinal(value, cardinal) {
  switch (cardinalRules.select(value)) {
    case "one":
      return cardinal;
    case "other":
      return `${cardinal}s`;
  }
}

var _tmpl$$7 = /* @__PURE__ */ template(`<div>`), _tmpl$2$4 = /* @__PURE__ */ template(`<header>`), _tmpl$3$3 = /* @__PURE__ */ template(`<thead><tr>`), _tmpl$4$2 = /* @__PURE__ */ template(`<tbody>`), _tmpl$5$1 = /* @__PURE__ */ template(`<th>`), _tmpl$6 = /* @__PURE__ */ template(`<tr>`), _tmpl$7 = /* @__PURE__ */ template(`<span>`);
const {
  format: formatWeekdayLong
} = new Intl.DateTimeFormat("en", {
  weekday: "long"
});
const {
  format: formatWeekdayShort
} = new Intl.DateTimeFormat("en", {
  weekday: "short"
});
const {
  format: formatMonth
} = new Intl.DateTimeFormat("en", {
  month: "long"
});
function getDayOfTheWeek(date) {
  const day = date.getDay() - 1;
  if (day < 0) {
    return 6;
  }
  return day;
}
function Calendar() {
  const {
    store
  } = useCirkel();
  const [amountOfMonths, setAmountOfMonths] = createSignal(12);
  const map = /* @__PURE__ */ new WeakMap();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const {
        setIsVisible,
        index
      } = map.get(entry.target);
      if (entry.isIntersecting && index >= amountOfMonths() - 2) {
        setIsVisible(entry.isIntersecting);
        setAmountOfMonths((amountOfMonths2) => amountOfMonths2 + 12);
      }
    });
  });
  return (() => {
    var _el$ = _tmpl$$7();
    insert(_el$, createComponent(index_default, {
      mode: "single",
      get initialValue() {
        return store.currentDate;
      },
      get numberOfMonths() {
        return amountOfMonths();
      },
      children: (props) => createComponent(Index, {
        get each() {
          return props.months;
        },
        children: (monthProps, index) => {
          const [isVisible, setIsVisible] = createSignal(true);
          const isFromThisMonth = (day) => day.getMonth() === monthProps().month.getMonth();
          const firstDayOfTheMonth = () => monthProps().weeks[0].find((day) => isFromThisMonth(day));
          return (() => {
            var _el$2 = _tmpl$$7();
            use((element) => {
              onMount(() => {
                map.set(element, {
                  setIsVisible,
                  index
                });
                observer.observe(element);
              });
            }, _el$2);
            insert(_el$2, createComponent(Show, {
              get when() {
                return isVisible();
              },
              get children() {
                return [(() => {
                  var _el$3 = _tmpl$2$4();
                  insert(_el$3, createComponent(index_default.Label, {
                    get ["class"]() {
                      return global.title;
                    },
                    get children() {
                      return [memo(() => formatMonth(monthProps().month)), " ", memo(() => monthProps().month.getFullYear())];
                    }
                  }));
                  return _el$3;
                })(), createComponent(index_default.Table, {
                  get children() {
                    return [(() => {
                      var _el$4 = _tmpl$3$3(), _el$5 = _el$4.firstChild;
                      insert(_el$5, createComponent(Index, {
                        get each() {
                          return props.weekdays;
                        },
                        children: (weekday, index2) => createComponent(Show, {
                          get when() {
                            return getDayOfTheWeek(firstDayOfTheMonth()) <= index2;
                          },
                          get fallback() {
                            return _tmpl$5$1();
                          },
                          get children() {
                            return createComponent(index_default.HeadCell, {
                              get abbr() {
                                return formatWeekdayLong(weekday());
                              },
                              get children() {
                                return formatWeekdayShort(weekday());
                              }
                            });
                          }
                        })
                      }));
                      return _el$4;
                    })(), (() => {
                      var _el$6 = _tmpl$4$2();
                      insert(_el$6, createComponent(Index, {
                        get each() {
                          return monthProps().weeks;
                        },
                        children: (week, index2) => (() => {
                          var _el$8 = _tmpl$6();
                          insert(_el$8, createComponent(Index, {
                            get each() {
                              return week();
                            },
                            children: (day) => {
                              const periodDay = createMemo(() => dayOfPeriod(store, new Date(day().getTime())));
                              const ovulationDay = createMemo(() => dayOfOvulation(store, new Date(day().getTime())));
                              return createComponent(Show, {
                                get when() {
                                  return isFromThisMonth(day());
                                },
                                get fallback() {
                                  return createComponent(Show, {
                                    when: index2 === 0,
                                    get fallback() {
                                      return (() => {
                                        var _el$0 = _tmpl$7();
                                        createRenderEffect(() => className(_el$0, styles$4.cell));
                                        return _el$0;
                                      })();
                                    },
                                    get children() {
                                      return createComponent(index_default.HeadCell, {
                                        get abbr() {
                                          return formatWeekdayLong(day());
                                        },
                                        get children() {
                                          return formatWeekdayShort(day());
                                        }
                                      });
                                    }
                                  });
                                },
                                get children() {
                                  return createComponent(index_default.Cell, {
                                    get style() {
                                      return {
                                        "--day-of-month": day().getDate()
                                      };
                                    },
                                    get ["data-phase"]() {
                                      return memo(() => periodDay() !== -1)() ? "period" : ovulationDay() !== -1 ? "ovulation" : void 0;
                                    },
                                    get ["data-day"]() {
                                      return day().getDate();
                                    },
                                    get ["data-start"]() {
                                      return periodDay() === 0 || ovulationDay() === 0 || void 0;
                                    },
                                    get ["data-end"]() {
                                      return periodDay() === store.settings.cycle.periodDuration - 1 || ovulationDay() === store.settings.cycle.ovulationDuration - 1 || void 0;
                                    },
                                    get ["class"]() {
                                      return clsx(isSameDay(day(), store.currentDate) ? styles$4.today : isSameDayOrBefore(day(), store.currentDate) ? styles$4.past : void 0);
                                    },
                                    get children() {
                                      return createComponent(Show, {
                                        get when() {
                                          return periodDay() !== -1 || ovulationDay() !== -1;
                                        },
                                        get children() {
                                          var _el$9 = _tmpl$$7();
                                          createRenderEffect(() => className(_el$9, styles$4.indicator));
                                          return _el$9;
                                        }
                                      });
                                    }
                                  });
                                }
                              });
                            }
                          }));
                          return _el$8;
                        })()
                      }));
                      return _el$6;
                    })()];
                  }
                })];
              }
            }));
            createRenderEffect(() => className(_el$2, styles$4.calendar));
            return _el$2;
          })();
        }
      })
    }));
    createRenderEffect(() => className(_el$, styles$4.calendarContainer));
    return _el$;
  })();
}

const overview = "_overview_6hm62_1";
const gradient = "_gradient_6hm62_12";
const main = "_main_6hm62_16";
const statement = "_statement_6hm62_72";
const styles$3 = {
	overview: overview,
	gradient: gradient,
	main: main,
	"cycle-button": "_cycle-button_6hm62_48",
	"text-path": "_text-path_6hm62_64",
	statement: statement
};

/**
 * Returns a function that will call all functions in the order they were chained with the same arguments.
 */
function chain(callbacks) {
    return (...args) => {
        for (const callback of callbacks)
            callback && callback(...args);
    };
}

/**
 * Utility for chaining multiple `ref` assignments with `props.ref` forwarding.
 * @param refs list of ref setters. Can be a `props.ref` prop for ref forwarding or a setter to a local variable (`el => ref = el`).
 * @example
 * ```tsx
 * interface ButtonProps {
 *    ref?: Ref<HTMLButtonElement>
 * }
 * function Button (props: ButtonProps) {
 *    let ref: HTMLButtonElement | undefined
 *    onMount(() => {
 *        // use the local ref
 *    })
 *    return <button ref={mergeRefs(props.ref, el => ref = el)} />
 * }
 *
 * // in consumer's component:
 * let ref: HTMLButtonElement | undefined
 * <Button ref={ref} />
 * ```
 */
function mergeRefs(...refs) {
    return chain(refs);
}

const buttons = "_buttons_1dl42_1";
const styles$2 = {
	buttons: buttons
};

var _tmpl$$6 = /* @__PURE__ */ template(`<svg stroke-width=0>`);
function IconTemplate(iconSrc, props) {
  const mergedProps = mergeProps(iconSrc.a, props);
  const [_, svgProps] = splitProps(mergedProps, ["src"]);
  const [content, setContent] = createSignal("");
  const rawContent = createMemo(() => props.title ? `${iconSrc.c}<title>${props.title}</title>` : iconSrc.c);
  createEffect(() => setContent(rawContent()));
  onCleanup(() => {
    setContent("");
  });
  return (() => {
    var _el$ = _tmpl$$6();
    spread(_el$, mergeProps({
      get stroke() {
        return iconSrc.a?.stroke;
      },
      get color() {
        return props.color || "currentColor";
      },
      get fill() {
        return props.color || "currentColor";
      },
      get style() {
        return {
          ...props.style,
          overflow: "visible"
        };
      }
    }, svgProps, {
      get height() {
        return props.size || "1em";
      },
      get width() {
        return props.size || "1em";
      },
      "xmlns": "http://www.w3.org/2000/svg",
      get innerHTML() {
        return content();
      }
    }), true, true);
    insert(_el$, () => isServer);
    return _el$;
  })();
}

function FiArrowLeft(props) {
      return IconTemplate({
        a: {"fill":"none","stroke":"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2","viewBox":"0 0 24 24"},
        c: '<path d="M19 12 5 12"/><path d="M12 19 5 12 12 5"/>'
      }, props)
  }
  function FiArrowRight(props) {
      return IconTemplate({
        a: {"fill":"none","stroke":"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2","viewBox":"0 0 24 24"},
        c: '<path d="M5 12 19 12"/><path d="M12 5 19 12 12 19"/>'
      }, props)
  }

const modal = "_modal_1ik1c_1";
const icon = "_icon_1ik1c_90";
const section = "_section_1ik1c_115";
const button = "_button_1ik1c_99";
const styles$1 = {
	modal: modal,
	"binary-option": "_binary-option_1ik1c_70",
	"label-container": "_label-container_1ik1c_79",
	icon: icon,
	"button-container": "_button-container_1ik1c_99",
	section: section,
	button: button
};

var _tmpl$$5 = /* @__PURE__ */ template(`<dialog>`), _tmpl$2$3 = /* @__PURE__ */ template(`<section><header><h3>`), _tmpl$3$2 = /* @__PURE__ */ template(`<button>`), _tmpl$4$1 = /* @__PURE__ */ template(`<div><div><div></div><div></div><div></div></div><div><button></button><button>`);
function Modal(props) {
  const [config, rest] = splitProps(props, ["class", "closeSlot", "children"]);
  const modal = (() => {
    var _el$ = _tmpl$$5();
    _el$.$$click = (event) => event.target === event.currentTarget && modal.close();
    spread(_el$, mergeProps({
      get ["class"]() {
        return clsx(styles$1.modal, config.class);
      }
    }, rest), false, true);
    insert(_el$, () => config.children, null);
    insert(_el$, createComponent(Show, {
      get when() {
        return config.closeSlot === void 0;
      },
      get fallback() {
        return config.closeSlot;
      },
      get children() {
        return createComponent(Modal.Button, {
          onClick: () => modal.close(""),
          children: "close"
        });
      }
    }), null);
    return _el$;
  })();
  return modal;
}
const ARROW_SIZE = 36;
Modal.Section = function(props) {
  return (() => {
    var _el$2 = _tmpl$2$3(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild;
    insert(_el$4, () => props.title);
    insert(_el$2, () => props.children, null);
    createRenderEffect(() => className(_el$2, styles$1.section));
    return _el$2;
  })();
};
Modal.Button = function(props) {
  return (() => {
    var _el$5 = _tmpl$3$2();
    spread(_el$5, mergeProps(props, {
      get ["class"]() {
        return clsx(props.class, styles$1.button);
      }
    }), false, false);
    return _el$5;
  })();
};
Modal.BinaryOption = function(props) {
  return (() => {
    var _el$6 = _tmpl$4$1(), _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling, _el$1 = _el$7.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling;
    insert(_el$8, createComponent(FiArrowLeft, {
      size: ARROW_SIZE
    }));
    insert(_el$9, () => props.title);
    insert(_el$0, createComponent(FiArrowRight, {
      size: ARROW_SIZE
    }));
    addEventListener(_el$10, "click", props.onLeftClick, true);
    addEventListener(_el$11, "click", props.onRightClick, true);
    createRenderEffect((_p$) => {
      var _v$ = styles$1["binary-option"], _v$2 = styles$1["label-container"], _v$3 = styles$1.icon, _v$4 = styles$1.label, _v$5 = styles$1.icon, _v$6 = styles$1["button-container"], _v$7 = props.disabled === "left" || props.disabled === true, _v$8 = props.disabled === "right" || props.disabled === true;
      _v$ !== _p$.e && className(_el$6, _p$.e = _v$);
      _v$2 !== _p$.t && className(_el$7, _p$.t = _v$2);
      _v$3 !== _p$.a && className(_el$8, _p$.a = _v$3);
      _v$4 !== _p$.o && className(_el$9, _p$.o = _v$4);
      _v$5 !== _p$.i && className(_el$0, _p$.i = _v$5);
      _v$6 !== _p$.n && className(_el$1, _p$.n = _v$6);
      _v$7 !== _p$.s && (_el$10.disabled = _p$.s = _v$7);
      _v$8 !== _p$.h && (_el$11.disabled = _p$.h = _v$8);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0
    });
    return _el$6;
  })();
};
function createModals(modals) {
  return Object.fromEntries(Object.entries(modals).map(([key, Modal2]) => {
    const [modal, setModal] = createSignal();
    return [key, {
      modal,
      Modal: (props) => createComponent(Modal2, mergeProps(props, {
        ref(r$) {
          var _ref$ = mergeRefs(setModal, props.ref);
          typeof _ref$ === "function" && _ref$(r$);
        }
      }))
    }];
  }));
}
delegateEvents(["click"]);

var _tmpl$$4 = /* @__PURE__ */ template(`<div>`), _tmpl$2$2 = /* @__PURE__ */ template(`<div><div>`);
function CycleStartModal(props) {
  const {
    store,
    setStore
  } = useCirkel();
  const [day, setDay] = createSignal(0);
  const [modal, setModal] = createSignal();
  return createComponent(Modal, mergeProps(props, {
    ref(r$) {
      var _ref$ = mergeRefs(setModal, props.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    onClose: () => setDay(0),
    get closeSlot() {
      return (() => {
        var _el$ = _tmpl$$4();
        insert(_el$, createComponent(Modal.Button, {
          onClick: () => modal()?.close(),
          children: "cancel"
        }), null);
        insert(_el$, createComponent(Modal.Button, {
          onClick: () => {
            setStore("entries", produce((entries) => entries.push({
              date: addDays(normalizeDate(/* @__PURE__ */ new Date()), day())
            })));
            modal()?.close();
          },
          children: "confirm"
        }), null);
        createRenderEffect(() => className(_el$, styles$2.buttons));
        return _el$;
      })();
    },
    get children() {
      return createComponent(Modal.Section, {
        title: "Start Day of Cycle",
        get children() {
          return createComponent(Modal.BinaryOption, {
            onLeftClick: () => setDay((day2) => day2 - 1),
            onRightClick: () => setDay((day2) => day2 + 1),
            get title() {
              return (() => {
                var _el$2 = _tmpl$2$2(), _el$3 = _el$2.firstChild;
                insert(_el$3, () => formatRelativeDay(day()));
                return _el$2;
              })();
            }
          });
        }
      });
    }
  }));
}

var _tmpl$$3 = /* @__PURE__ */ template(`<div><div>cycle duraton</div><div> days`), _tmpl$2$1 = /* @__PURE__ */ template(`<div><div>period duraton</div><div> days`), _tmpl$3$1 = /* @__PURE__ */ template(`<div><div> day</div><div>of your cycle`);
function MenuModal(props) {
  const {
    store,
    setStore
  } = useCirkel();
  return createComponent(Modal, mergeProps(props, {
    get children() {
      return [createComponent(Modal.Section, {
        title: "Cycle Settings",
        get children() {
          return [createComponent(Modal.BinaryOption, {
            get disabled() {
              return store.settings.cycle.cycleDuration === 1 ? "left" : void 0;
            },
            onLeftClick: () => setStore(produce((store2) => store2.settings.cycle.cycleDuration--)),
            onRightClick: () => setStore(produce((store2) => store2.settings.cycle.cycleDuration++)),
            get title() {
              return (() => {
                var _el$ = _tmpl$$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild;
                insert(_el$3, () => store.settings.cycle.cycleDuration, _el$4);
                return _el$;
              })();
            }
          }), createComponent(Modal.BinaryOption, {
            get disabled() {
              return store.settings.cycle.periodDuration === 1 ? "left" : void 0;
            },
            onLeftClick: () => setStore(produce((store2) => store2.settings.cycle.periodDuration--)),
            onRightClick: () => setStore(produce((store2) => store2.settings.cycle.periodDuration++)),
            get title() {
              return (() => {
                var _el$5 = _tmpl$2$1(), _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild;
                insert(_el$7, () => store.settings.cycle.periodDuration, _el$8);
                return _el$5;
              })();
            }
          }), createComponent(Modal.BinaryOption, {
            get disabled() {
              return getDayOfTheCycle(store, store.currentDate) === 0 ? "left" : void 0;
            },
            onLeftClick: () => setStore(produce((store2) => {
              const entry = store2.entries[store2.entries.length - 1];
              entry.date = new Date(entry.date.getTime() + DAY);
            })),
            onRightClick: () => setStore(produce((store2) => {
              const entry = store2.entries[store2.entries.length - 1];
              entry.date = new Date(entry.date.getTime() - DAY);
            })),
            get title() {
              return (() => {
                var _el$9 = _tmpl$3$1(), _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild;
                insert(_el$0, () => postfixOrdinal(getDayOfTheCycle(store, store.currentDate) + 1), _el$1);
                return _el$9;
              })();
            }
          })];
        }
      }), createComponent(Modal.Section, {
        title: "App Settings",
        get children() {
          return createComponent(Modal.BinaryOption, {
            onLeftClick: () => setStore("settings", "app", "theme", (theme) => {
              let index = themes.indexOf(theme);
              index -= 1;
              if (index < 0) {
                index = themes.length - 1;
              }
              return themes[index];
            }),
            onRightClick: () => setStore("settings", "app", "theme", (theme) => {
              let index = themes.indexOf(theme);
              index += 1;
              index %= themes.length;
              return themes[index];
            }),
            get title() {
              return [memo(() => store.settings.app.theme), " theme"];
            }
          });
        }
      })];
    }
  }));
}

const modals = createModals({
  menu: MenuModal,
  cycleStart: CycleStartModal
});

var _tmpl$$2 = /* @__PURE__ */ template(`<em> `), _tmpl$2 = /* @__PURE__ */ template(`<div>until your period ends (regularly).`), _tmpl$3 = /* @__PURE__ */ template(`<div>until day of your ovulation (maybe).`), _tmpl$4 = /* @__PURE__ */ template(`<div><div></div><section><section><em> day</em><div>of your cycle</div></section><section></section></section><section><button></button><svg><defs><path fill-rule=evenodd id=MyPath stroke=white></path></defs><text><textPath href=#MyPath stroke=white startOffset=25px textLength=155px>a new cycle</textPath></text><line x1=0 y1=0 y2=0 stroke=var(--color-border) stroke-width=1px></line><line x2=0 y1=0 stroke=var(--color-border) stroke-width=1px></line><line x2=0 y1=0 stroke=var(--color-border) stroke-width=1px></line><line x2=0 y1=0 stroke=var(--color-border) stroke-width=1px></line><line x2=0 y1=0 stroke=var(--color-border) stroke-width=1px></line><line x2=0 y1=0 stroke=var(--color-border) stroke-width=1px></line><line y1=0 stroke=var(--color-border) stroke-width=1px></line><line y1=0 stroke=var(--color-border) stroke-width=1px></line><line y1=0 stroke=var(--color-border) stroke-width=1px></line><line y1=0 stroke=var(--color-border) stroke-width=1px></line><line y1=0 stroke=var(--color-border) stroke-width=1px></line><line y1=0 stroke=var(--color-border) stroke-width=1px></line><line y1=0 stroke=var(--color-border) stroke-width=1px>`), _tmpl$5 = /* @__PURE__ */ template(`<div>until your cycle is completed`);
const [bounds, setBounds] = createSignal(document.body.getBoundingClientRect());
new ResizeObserver(() => setBounds(document.body.getBoundingClientRect())).observe(document.body);
const BUTTON_SIZE = 80;
function Home() {
  const {
    store
  } = useCirkel();
  const svgHeight = createMemo(() => bounds().height / 64 * 19);
  function toPercentageModulo(value) {
    return value / store.settings.cycle.cycleDuration * 100 % 100;
  }
  function createGradientStops() {
    const daysUntilCycleCompletes = store.settings.cycle.cycleDuration - getDayOfTheCycle(store, store.currentDate) % store.settings.cycle.cycleDuration;
    const daysUntilOvulation = daysUntilCycleCompletes + store.settings.cycle.cycleDuration / 2;
    const daysUntilEndOfPeriod = daysUntilCycleCompletes + store.settings.cycle.periodDuration;
    const stops = [["var(--color-bg-gradient)", toPercentageModulo(daysUntilCycleCompletes - 1)], ["var(--color-period)", toPercentageModulo(daysUntilCycleCompletes + 1)], ["var(--color-period)", toPercentageModulo(daysUntilEndOfPeriod - 1)], ["var(--color-bg-gradient)", toPercentageModulo(daysUntilEndOfPeriod + 1)], ["var(--color-bg-gradient)", toPercentageModulo(daysUntilOvulation - 4)], ["var(--color-ovulation)", toPercentageModulo(daysUntilOvulation - 3)], ["var(--color-ovulation)", toPercentageModulo(daysUntilOvulation)], ["var(--color-bg-gradient)", toPercentageModulo(daysUntilOvulation + 1)]].sort(([, a], [, b]) => a - b < 0 ? -1 : 1);
    const [firstColor, firstPercentage] = stops[0];
    if (firstPercentage === 0) {
      stops.push([firstColor, 100]);
    }
    return stops.map(([color, percentage]) => [color, `${percentage}%`]);
  }
  function halfCirclePath(cx, cy, r) {
    return "M " + cx + " " + cy + " m -" + r + ", 0 a " + r + "," + r + " 0 1,1 " + r * 2 + ", 0";
  }
  function createGradient() {
    return `linear-gradient(to right, ${createGradientStops().map((arr) => arr.join(" ")).join(", ")})`;
  }
  return (() => {
    var _el$ = _tmpl$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$4.nextSibling, _el$12 = _el$3.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$15.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$17.nextSibling, _el$20 = _el$19.nextSibling, _el$21 = _el$20.nextSibling, _el$22 = _el$21.nextSibling, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling, _el$25 = _el$24.nextSibling, _el$26 = _el$25.nextSibling, _el$27 = _el$26.nextSibling, _el$28 = _el$27.nextSibling, _el$29 = _el$28.nextSibling, _el$30 = _el$29.nextSibling, _el$31 = _el$30.nextSibling;
    insert(_el$5, () => postfixOrdinal(getDayOfTheCycle(store, store.currentDate) + 1), _el$6);
    insert(_el$7, createComponent(Switch, {
      get fallback() {
        return [(() => {
          var _el$32 = _tmpl$$2(), _el$33 = _el$32.firstChild;
          insert(_el$32, () => getDaysUntilCycleCompletes(store, store.currentDate), _el$33);
          insert(_el$32, () => postfixCardinal(getDaysUntilCycleCompletes(store, store.currentDate), "day"), null);
          return _el$32;
        })(), _tmpl$5()];
      },
      get children() {
        return [createComponent(Match, {
          get when() {
            return dayOfPeriod(store, store.currentDate) !== -1;
          },
          get children() {
            return [(() => {
              var _el$8 = _tmpl$$2(), _el$9 = _el$8.firstChild;
              insert(_el$8, () => store.settings.cycle.periodDuration - dayOfPeriod(store, store.currentDate), _el$9);
              insert(_el$8, () => postfixCardinal(store.settings.cycle.periodDuration - dayOfPeriod(store, store.currentDate), "day"), null);
              return _el$8;
            })(), _tmpl$2()];
          }
        }), createComponent(Match, {
          get when() {
            return dayOfOvulation(store, store.currentDate) !== -1;
          },
          get children() {
            return [(() => {
              var _el$1 = _tmpl$$2(), _el$10 = _el$1.firstChild;
              insert(_el$1, () => store.settings.cycle.ovulationDuration - dayOfOvulation(store, store.currentDate), _el$10);
              insert(_el$1, () => postfixCardinal(store.settings.cycle.ovulationDuration - dayOfOvulation(store, store.currentDate), "day"), null);
              return _el$1;
            })(), _tmpl$3()];
          }
        })];
      }
    }));
    _el$13.$$click = () => modals.cycleStart.modal()?.show();
    createRenderEffect((_p$) => {
      var _v$ = styles$3.overview, _v$2 = `${svgHeight()}px`, _v$3 = createGradient(), _v$4 = styles$3.gradient, _v$5 = styles$3.main, _v$6 = styles$3.statement, _v$7 = styles$3["cycle-button"], _v$8 = bounds().width, _v$9 = svgHeight() + BUTTON_SIZE, _v$0 = `0 -${BUTTON_SIZE / 2} ${bounds().width} ${svgHeight()}`, _v$1 = halfCirclePath(bounds().width / 2, 0, 4 * BUTTON_SIZE / 5), _v$10 = styles$3["text-path"], _v$11 = bounds().width, _v$12 = bounds().width / 2, _v$13 = svgHeight() / 4, _v$14 = bounds().width / 2, _v$15 = svgHeight() / 2, _v$16 = bounds().width / 2, _v$17 = 3 * svgHeight() / 4, _v$18 = bounds().width / 2, _v$19 = svgHeight(), _v$20 = bounds().width / 2, _v$21 = svgHeight(), _v$22 = bounds().width / 2, _v$23 = bounds().width / 4, _v$24 = svgHeight(), _v$25 = bounds().width / 2, _v$26 = bounds().width / 2, _v$27 = svgHeight(), _v$28 = bounds().width / 2, _v$29 = 3 * bounds().width / 4, _v$30 = svgHeight(), _v$31 = bounds().width / 2, _v$32 = bounds().width, _v$33 = svgHeight(), _v$34 = bounds().width / 2, _v$35 = bounds().width, _v$36 = svgHeight() / 4, _v$37 = bounds().width / 2, _v$38 = bounds().width, _v$39 = svgHeight() / 2, _v$40 = bounds().width / 2, _v$41 = bounds().width, _v$42 = 3 * svgHeight() / 4;
      _v$ !== _p$.e && className(_el$, _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$, "--svg-height", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$2, "background", _p$.a = _v$3);
      _v$4 !== _p$.o && className(_el$2, _p$.o = _v$4);
      _v$5 !== _p$.i && className(_el$3, _p$.i = _v$5);
      _v$6 !== _p$.n && className(_el$7, _p$.n = _v$6);
      _v$7 !== _p$.s && className(_el$13, _p$.s = _v$7);
      _v$8 !== _p$.h && setAttribute(_el$14, "width", _p$.h = _v$8);
      _v$9 !== _p$.r && setAttribute(_el$14, "height", _p$.r = _v$9);
      _v$0 !== _p$.d && setAttribute(_el$14, "viewBox", _p$.d = _v$0);
      _v$1 !== _p$.l && setAttribute(_el$16, "d", _p$.l = _v$1);
      _v$10 !== _p$.u && setAttribute(_el$18, "class", _p$.u = _v$10);
      _v$11 !== _p$.c && setAttribute(_el$19, "x2", _p$.c = _v$11);
      _v$12 !== _p$.w && setAttribute(_el$20, "x1", _p$.w = _v$12);
      _v$13 !== _p$.m && setAttribute(_el$20, "y2", _p$.m = _v$13);
      _v$14 !== _p$.f && setAttribute(_el$21, "x1", _p$.f = _v$14);
      _v$15 !== _p$.y && setAttribute(_el$21, "y2", _p$.y = _v$15);
      _v$16 !== _p$.g && setAttribute(_el$22, "x1", _p$.g = _v$16);
      _v$17 !== _p$.p && setAttribute(_el$22, "y2", _p$.p = _v$17);
      _v$18 !== _p$.b && setAttribute(_el$23, "x1", _p$.b = _v$18);
      _v$19 !== _p$.T && setAttribute(_el$23, "y2", _p$.T = _v$19);
      _v$20 !== _p$.A && setAttribute(_el$24, "x1", _p$.A = _v$20);
      _v$21 !== _p$.O && setAttribute(_el$24, "y2", _p$.O = _v$21);
      _v$22 !== _p$.I && setAttribute(_el$25, "x1", _p$.I = _v$22);
      _v$23 !== _p$.S && setAttribute(_el$25, "x2", _p$.S = _v$23);
      _v$24 !== _p$.W && setAttribute(_el$25, "y2", _p$.W = _v$24);
      _v$25 !== _p$.C && setAttribute(_el$26, "x1", _p$.C = _v$25);
      _v$26 !== _p$.B && setAttribute(_el$26, "x2", _p$.B = _v$26);
      _v$27 !== _p$.v && setAttribute(_el$26, "y2", _p$.v = _v$27);
      _v$28 !== _p$.k && setAttribute(_el$27, "x1", _p$.k = _v$28);
      _v$29 !== _p$.x && setAttribute(_el$27, "x2", _p$.x = _v$29);
      _v$30 !== _p$.j && setAttribute(_el$27, "y2", _p$.j = _v$30);
      _v$31 !== _p$.q && setAttribute(_el$28, "x1", _p$.q = _v$31);
      _v$32 !== _p$.z && setAttribute(_el$28, "x2", _p$.z = _v$32);
      _v$33 !== _p$.P && setAttribute(_el$28, "y2", _p$.P = _v$33);
      _v$34 !== _p$.H && setAttribute(_el$29, "x1", _p$.H = _v$34);
      _v$35 !== _p$.F && setAttribute(_el$29, "x2", _p$.F = _v$35);
      _v$36 !== _p$.M && setAttribute(_el$29, "y2", _p$.M = _v$36);
      _v$37 !== _p$.D && setAttribute(_el$30, "x1", _p$.D = _v$37);
      _v$38 !== _p$.R && setAttribute(_el$30, "x2", _p$.R = _v$38);
      _v$39 !== _p$.E && setAttribute(_el$30, "y2", _p$.E = _v$39);
      _v$40 !== _p$.L && setAttribute(_el$31, "x1", _p$.L = _v$40);
      _v$41 !== _p$.N && setAttribute(_el$31, "x2", _p$.N = _v$41);
      _v$42 !== _p$.G && setAttribute(_el$31, "y2", _p$.G = _v$42);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0,
      r: void 0,
      d: void 0,
      l: void 0,
      u: void 0,
      c: void 0,
      w: void 0,
      m: void 0,
      f: void 0,
      y: void 0,
      g: void 0,
      p: void 0,
      b: void 0,
      T: void 0,
      A: void 0,
      O: void 0,
      I: void 0,
      S: void 0,
      W: void 0,
      C: void 0,
      B: void 0,
      v: void 0,
      k: void 0,
      x: void 0,
      j: void 0,
      q: void 0,
      z: void 0,
      P: void 0,
      H: void 0,
      F: void 0,
      M: void 0,
      D: void 0,
      R: void 0,
      E: void 0,
      L: void 0,
      N: void 0,
      G: void 0
    });
    return _el$;
  })();
}
delegateEvents(["click"]);

function VsMenu(props) {
      return IconTemplate({
        a: {"fill":"currentColor","viewBox":"0 0 16 16"},
        c: '<path d="M16 5H0V4h16v1zm0 8H0v-1h16v1zm0-4.008H0V8h16v.992z"/>'
      }, props)
  }

const menu = "_menu_vahlv_31";
const active = "_active_vahlv_46";
const styles = {
	"navigation-container": "_navigation-container_vahlv_1",
	menu: menu,
	active: active
};

var _tmpl$$1 = /* @__PURE__ */ template(`<div><nav><div></div><div></div><button><span>menu`);
function Navigation(props) {
  return (() => {
    var _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling; _el$5.firstChild;
    insert(_el$3, createComponent(A, {
      href: "/",
      get activeClass() {
        return styles.active;
      },
      end: true,
      children: "home"
    }));
    insert(_el$4, createComponent(A, {
      href: "/calendar",
      get activeClass() {
        return styles.active;
      },
      children: "calendar"
    }));
    _el$5.$$click = () => props.menu.show();
    insert(_el$5, createComponent(VsMenu, {}), null);
    createRenderEffect((_p$) => {
      var _v$ = styles["navigation-container"], _v$2 = styles.menu;
      _v$ !== _p$.e && className(_el$, _p$.e = _v$);
      _v$2 !== _p$.t && className(_el$5, _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
}
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<div>`);
function App() {
  const [store, setStore] = makePersisted(createStore({
    settings: {
      cycle: {
        cycleDuration: 25,
        periodDuration: 5,
        ovulationDuration: 4
      },
      app: {
        theme: "light"
      }
    },
    entries: [{
      date: addDays(normalizeDate(/* @__PURE__ */ new Date()), -5)
    }],
    currentDate: normalizeDate(/* @__PURE__ */ new Date())
  }), {
    storage: localStorage,
    name: "cirkel",
    deserialize(json) {
      const data = JSON.parse(json);
      return {
        ...data,
        entries: data.entries.map((entry) => ({
          ...entry,
          date: new Date(entry.date)
        })),
        currentDate: normalizeDate(/* @__PURE__ */ new Date())
      };
    }
  });
  return (() => {
    var _el$ = _tmpl$();
    insert(_el$, createComponent(CirkeStoreContext.Provider, {
      value: {
        store,
        setStore
      },
      get children() {
        return [createComponent(modals.menu.Modal, {}), createComponent(modals.cycleStart.Modal, {}), createComponent(Router, {
          get url() {
            return "cirkel";
          },
          get base() {
            return "cirkel";
          },
          root: (props) => {
            const transition = function(fnThatChangesTheDOM) {
              if (!document.startViewTransition) {
                return fnThatChangesTheDOM();
              }
              document.startViewTransition(fnThatChangesTheDOM);
            };
            useBeforeLeave((e) => {
              e.preventDefault();
              transition(() => {
                e.retry(true);
              });
            });
            return [memo(() => props.children), createComponent(Navigation, {
              get menu() {
                return modals.menu.modal();
              }
            })];
          },
          get children() {
            return [createComponent(Route, {
              path: "/",
              component: Home
            }), createComponent(Route, {
              path: "/calendar",
              component: Calendar
            })];
          }
        })];
      }
    }));
    createRenderEffect(() => className(_el$, clsx(styles$5.page, theme[store.settings.app.theme])));
    return _el$;
  })();
}

const root = document.getElementById("root");
render(() => createComponent(App, {}), root);
