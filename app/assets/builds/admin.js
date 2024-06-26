(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@rails/actioncable/src/adapters.js
  var adapters_default;
  var init_adapters = __esm({
    "node_modules/@rails/actioncable/src/adapters.js"() {
      adapters_default = {
        logger: self.console,
        WebSocket: self.WebSocket
      };
    }
  });

  // node_modules/@rails/actioncable/src/logger.js
  var logger_default;
  var init_logger = __esm({
    "node_modules/@rails/actioncable/src/logger.js"() {
      init_adapters();
      logger_default = {
        log(...messages) {
          if (this.enabled) {
            messages.push(Date.now());
            adapters_default.logger.log("[ActionCable]", ...messages);
          }
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/connection_monitor.js
  var now, secondsSince, ConnectionMonitor, connection_monitor_default;
  var init_connection_monitor = __esm({
    "node_modules/@rails/actioncable/src/connection_monitor.js"() {
      init_logger();
      now = () => new Date().getTime();
      secondsSince = (time) => (now() - time) / 1e3;
      ConnectionMonitor = class {
        constructor(connection) {
          this.visibilityDidChange = this.visibilityDidChange.bind(this);
          this.connection = connection;
          this.reconnectAttempts = 0;
        }
        start() {
          if (!this.isRunning()) {
            this.startedAt = now();
            delete this.stoppedAt;
            this.startPolling();
            addEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`);
          }
        }
        stop() {
          if (this.isRunning()) {
            this.stoppedAt = now();
            this.stopPolling();
            removeEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log("ConnectionMonitor stopped");
          }
        }
        isRunning() {
          return this.startedAt && !this.stoppedAt;
        }
        recordPing() {
          this.pingedAt = now();
        }
        recordConnect() {
          this.reconnectAttempts = 0;
          this.recordPing();
          delete this.disconnectedAt;
          logger_default.log("ConnectionMonitor recorded connect");
        }
        recordDisconnect() {
          this.disconnectedAt = now();
          logger_default.log("ConnectionMonitor recorded disconnect");
        }
        startPolling() {
          this.stopPolling();
          this.poll();
        }
        stopPolling() {
          clearTimeout(this.pollTimeout);
        }
        poll() {
          this.pollTimeout = setTimeout(
            () => {
              this.reconnectIfStale();
              this.poll();
            },
            this.getPollInterval()
          );
        }
        getPollInterval() {
          const { staleThreshold, reconnectionBackoffRate } = this.constructor;
          const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10));
          const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate;
          const jitter = jitterMax * Math.random();
          return staleThreshold * 1e3 * backoff * (1 + jitter);
        }
        reconnectIfStale() {
          if (this.connectionIsStale()) {
            logger_default.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`);
            this.reconnectAttempts++;
            if (this.disconnectedRecently()) {
              logger_default.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince(this.disconnectedAt)} s`);
            } else {
              logger_default.log("ConnectionMonitor reopening");
              this.connection.reopen();
            }
          }
        }
        get refreshedAt() {
          return this.pingedAt ? this.pingedAt : this.startedAt;
        }
        connectionIsStale() {
          return secondsSince(this.refreshedAt) > this.constructor.staleThreshold;
        }
        disconnectedRecently() {
          return this.disconnectedAt && secondsSince(this.disconnectedAt) < this.constructor.staleThreshold;
        }
        visibilityDidChange() {
          if (document.visibilityState === "visible") {
            setTimeout(
              () => {
                if (this.connectionIsStale() || !this.connection.isOpen()) {
                  logger_default.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`);
                  this.connection.reopen();
                }
              },
              200
            );
          }
        }
      };
      ConnectionMonitor.staleThreshold = 6;
      ConnectionMonitor.reconnectionBackoffRate = 0.15;
      connection_monitor_default = ConnectionMonitor;
    }
  });

  // node_modules/@rails/actioncable/src/internal.js
  var internal_default;
  var init_internal = __esm({
    "node_modules/@rails/actioncable/src/internal.js"() {
      internal_default = {
        "message_types": {
          "welcome": "welcome",
          "disconnect": "disconnect",
          "ping": "ping",
          "confirmation": "confirm_subscription",
          "rejection": "reject_subscription"
        },
        "disconnect_reasons": {
          "unauthorized": "unauthorized",
          "invalid_request": "invalid_request",
          "server_restart": "server_restart"
        },
        "default_mount_path": "/cable",
        "protocols": [
          "actioncable-v1-json",
          "actioncable-unsupported"
        ]
      };
    }
  });

  // node_modules/@rails/actioncable/src/connection.js
  var message_types, protocols, supportedProtocols, indexOf, Connection, connection_default;
  var init_connection = __esm({
    "node_modules/@rails/actioncable/src/connection.js"() {
      init_adapters();
      init_connection_monitor();
      init_internal();
      init_logger();
      ({ message_types, protocols } = internal_default);
      supportedProtocols = protocols.slice(0, protocols.length - 1);
      indexOf = [].indexOf;
      Connection = class {
        constructor(consumer2) {
          this.open = this.open.bind(this);
          this.consumer = consumer2;
          this.subscriptions = this.consumer.subscriptions;
          this.monitor = new connection_monitor_default(this);
          this.disconnected = true;
        }
        send(data) {
          if (this.isOpen()) {
            this.webSocket.send(JSON.stringify(data));
            return true;
          } else {
            return false;
          }
        }
        open() {
          if (this.isActive()) {
            logger_default.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
            return false;
          } else {
            logger_default.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`);
            if (this.webSocket) {
              this.uninstallEventHandlers();
            }
            this.webSocket = new adapters_default.WebSocket(this.consumer.url, protocols);
            this.installEventHandlers();
            this.monitor.start();
            return true;
          }
        }
        close({ allowReconnect } = { allowReconnect: true }) {
          if (!allowReconnect) {
            this.monitor.stop();
          }
          if (this.isOpen()) {
            return this.webSocket.close();
          }
        }
        reopen() {
          logger_default.log(`Reopening WebSocket, current state is ${this.getState()}`);
          if (this.isActive()) {
            try {
              return this.close();
            } catch (error2) {
              logger_default.log("Failed to reopen WebSocket", error2);
            } finally {
              logger_default.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`);
              setTimeout(this.open, this.constructor.reopenDelay);
            }
          } else {
            return this.open();
          }
        }
        getProtocol() {
          if (this.webSocket) {
            return this.webSocket.protocol;
          }
        }
        isOpen() {
          return this.isState("open");
        }
        isActive() {
          return this.isState("open", "connecting");
        }
        isProtocolSupported() {
          return indexOf.call(supportedProtocols, this.getProtocol()) >= 0;
        }
        isState(...states) {
          return indexOf.call(states, this.getState()) >= 0;
        }
        getState() {
          if (this.webSocket) {
            for (let state in adapters_default.WebSocket) {
              if (adapters_default.WebSocket[state] === this.webSocket.readyState) {
                return state.toLowerCase();
              }
            }
          }
          return null;
        }
        installEventHandlers() {
          for (let eventName in this.events) {
            const handler = this.events[eventName].bind(this);
            this.webSocket[`on${eventName}`] = handler;
          }
        }
        uninstallEventHandlers() {
          for (let eventName in this.events) {
            this.webSocket[`on${eventName}`] = function() {
            };
          }
        }
      };
      Connection.reopenDelay = 500;
      Connection.prototype.events = {
        message(event) {
          if (!this.isProtocolSupported()) {
            return;
          }
          const { identifier, message, reason, reconnect, type } = JSON.parse(event.data);
          switch (type) {
            case message_types.welcome:
              this.monitor.recordConnect();
              return this.subscriptions.reload();
            case message_types.disconnect:
              logger_default.log(`Disconnecting. Reason: ${reason}`);
              return this.close({ allowReconnect: reconnect });
            case message_types.ping:
              return this.monitor.recordPing();
            case message_types.confirmation:
              this.subscriptions.confirmSubscription(identifier);
              return this.subscriptions.notify(identifier, "connected");
            case message_types.rejection:
              return this.subscriptions.reject(identifier);
            default:
              return this.subscriptions.notify(identifier, "received", message);
          }
        },
        open() {
          logger_default.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
          this.disconnected = false;
          if (!this.isProtocolSupported()) {
            logger_default.log("Protocol is unsupported. Stopping monitor and disconnecting.");
            return this.close({ allowReconnect: false });
          }
        },
        close(event) {
          logger_default.log("WebSocket onclose event");
          if (this.disconnected) {
            return;
          }
          this.disconnected = true;
          this.monitor.recordDisconnect();
          return this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() });
        },
        error() {
          logger_default.log("WebSocket onerror event");
        }
      };
      connection_default = Connection;
    }
  });

  // node_modules/@rails/actioncable/src/subscription.js
  var extend, Subscription;
  var init_subscription = __esm({
    "node_modules/@rails/actioncable/src/subscription.js"() {
      extend = function(object, properties) {
        if (properties != null) {
          for (let key in properties) {
            const value = properties[key];
            object[key] = value;
          }
        }
        return object;
      };
      Subscription = class {
        constructor(consumer2, params = {}, mixin) {
          this.consumer = consumer2;
          this.identifier = JSON.stringify(params);
          extend(this, mixin);
        }
        perform(action, data = {}) {
          data.action = action;
          return this.send(data);
        }
        send(data) {
          return this.consumer.send({ command: "message", identifier: this.identifier, data: JSON.stringify(data) });
        }
        unsubscribe() {
          return this.consumer.subscriptions.remove(this);
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/subscription_guarantor.js
  var SubscriptionGuarantor, subscription_guarantor_default;
  var init_subscription_guarantor = __esm({
    "node_modules/@rails/actioncable/src/subscription_guarantor.js"() {
      init_logger();
      SubscriptionGuarantor = class {
        constructor(subscriptions) {
          this.subscriptions = subscriptions;
          this.pendingSubscriptions = [];
        }
        guarantee(subscription) {
          if (this.pendingSubscriptions.indexOf(subscription) == -1) {
            logger_default.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`);
            this.pendingSubscriptions.push(subscription);
          } else {
            logger_default.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`);
          }
          this.startGuaranteeing();
        }
        forget(subscription) {
          logger_default.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`);
          this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s !== subscription);
        }
        startGuaranteeing() {
          this.stopGuaranteeing();
          this.retrySubscribing();
        }
        stopGuaranteeing() {
          clearTimeout(this.retryTimeout);
        }
        retrySubscribing() {
          this.retryTimeout = setTimeout(
            () => {
              if (this.subscriptions && typeof this.subscriptions.subscribe === "function") {
                this.pendingSubscriptions.map((subscription) => {
                  logger_default.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`);
                  this.subscriptions.subscribe(subscription);
                });
              }
            },
            500
          );
        }
      };
      subscription_guarantor_default = SubscriptionGuarantor;
    }
  });

  // node_modules/@rails/actioncable/src/subscriptions.js
  var Subscriptions;
  var init_subscriptions = __esm({
    "node_modules/@rails/actioncable/src/subscriptions.js"() {
      init_subscription();
      init_subscription_guarantor();
      init_logger();
      Subscriptions = class {
        constructor(consumer2) {
          this.consumer = consumer2;
          this.guarantor = new subscription_guarantor_default(this);
          this.subscriptions = [];
        }
        create(channelName, mixin) {
          const channel = channelName;
          const params = typeof channel === "object" ? channel : { channel };
          const subscription = new Subscription(this.consumer, params, mixin);
          return this.add(subscription);
        }
        add(subscription) {
          this.subscriptions.push(subscription);
          this.consumer.ensureActiveConnection();
          this.notify(subscription, "initialized");
          this.subscribe(subscription);
          return subscription;
        }
        remove(subscription) {
          this.forget(subscription);
          if (!this.findAll(subscription.identifier).length) {
            this.sendCommand(subscription, "unsubscribe");
          }
          return subscription;
        }
        reject(identifier) {
          return this.findAll(identifier).map((subscription) => {
            this.forget(subscription);
            this.notify(subscription, "rejected");
            return subscription;
          });
        }
        forget(subscription) {
          this.guarantor.forget(subscription);
          this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
          return subscription;
        }
        findAll(identifier) {
          return this.subscriptions.filter((s) => s.identifier === identifier);
        }
        reload() {
          return this.subscriptions.map((subscription) => this.subscribe(subscription));
        }
        notifyAll(callbackName, ...args) {
          return this.subscriptions.map((subscription) => this.notify(subscription, callbackName, ...args));
        }
        notify(subscription, callbackName, ...args) {
          let subscriptions;
          if (typeof subscription === "string") {
            subscriptions = this.findAll(subscription);
          } else {
            subscriptions = [subscription];
          }
          return subscriptions.map((subscription2) => typeof subscription2[callbackName] === "function" ? subscription2[callbackName](...args) : void 0);
        }
        subscribe(subscription) {
          if (this.sendCommand(subscription, "subscribe")) {
            this.guarantor.guarantee(subscription);
          }
        }
        confirmSubscription(identifier) {
          logger_default.log(`Subscription confirmed ${identifier}`);
          this.findAll(identifier).map((subscription) => this.guarantor.forget(subscription));
        }
        sendCommand(subscription, command) {
          const { identifier } = subscription;
          return this.consumer.send({ command, identifier });
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/consumer.js
  function createWebSocketURL(url) {
    if (typeof url === "function") {
      url = url();
    }
    if (url && !/^wss?:/i.test(url)) {
      const a = document.createElement("a");
      a.href = url;
      a.href = a.href;
      a.protocol = a.protocol.replace("http", "ws");
      return a.href;
    } else {
      return url;
    }
  }
  var Consumer;
  var init_consumer = __esm({
    "node_modules/@rails/actioncable/src/consumer.js"() {
      init_connection();
      init_subscriptions();
      Consumer = class {
        constructor(url) {
          this._url = url;
          this.subscriptions = new Subscriptions(this);
          this.connection = new connection_default(this);
        }
        get url() {
          return createWebSocketURL(this._url);
        }
        send(data) {
          return this.connection.send(data);
        }
        connect() {
          return this.connection.open();
        }
        disconnect() {
          return this.connection.close({ allowReconnect: false });
        }
        ensureActiveConnection() {
          if (!this.connection.isActive()) {
            return this.connection.open();
          }
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/index.js
  var src_exports = {};
  __export(src_exports, {
    Connection: () => connection_default,
    ConnectionMonitor: () => connection_monitor_default,
    Consumer: () => Consumer,
    INTERNAL: () => internal_default,
    Subscription: () => Subscription,
    SubscriptionGuarantor: () => subscription_guarantor_default,
    Subscriptions: () => Subscriptions,
    adapters: () => adapters_default,
    createConsumer: () => createConsumer,
    createWebSocketURL: () => createWebSocketURL,
    getConfig: () => getConfig,
    logger: () => logger_default
  });
  function createConsumer(url = getConfig("url") || internal_default.default_mount_path) {
    return new Consumer(url);
  }
  function getConfig(name) {
    const element = document.head.querySelector(`meta[name='action-cable-${name}']`);
    if (element) {
      return element.getAttribute("content");
    }
  }
  var init_src = __esm({
    "node_modules/@rails/actioncable/src/index.js"() {
      init_connection();
      init_connection_monitor();
      init_consumer();
      init_internal();
      init_subscription();
      init_subscriptions();
      init_subscription_guarantor();
      init_adapters();
      init_logger();
    }
  });

  // node_modules/@hotwired/turbo/dist/turbo.es2017-esm.js
  var turbo_es2017_esm_exports = {};
  __export(turbo_es2017_esm_exports, {
    FrameElement: () => FrameElement,
    FrameLoadingStyle: () => FrameLoadingStyle,
    FrameRenderer: () => FrameRenderer,
    PageRenderer: () => PageRenderer,
    PageSnapshot: () => PageSnapshot,
    StreamActions: () => StreamActions,
    StreamElement: () => StreamElement,
    StreamSourceElement: () => StreamSourceElement,
    cache: () => cache,
    clearCache: () => clearCache,
    connectStreamSource: () => connectStreamSource,
    disconnectStreamSource: () => disconnectStreamSource,
    navigator: () => navigator$1,
    registerAdapter: () => registerAdapter,
    renderStreamMessage: () => renderStreamMessage,
    session: () => session,
    setConfirmMethod: () => setConfirmMethod,
    setFormMode: () => setFormMode,
    setProgressBarDelay: () => setProgressBarDelay,
    start: () => start,
    visit: () => visit
  });
  (function() {
    if (window.Reflect === void 0 || window.customElements === void 0 || window.customElements.polyfillWrapFlushCallback) {
      return;
    }
    const BuiltInHTMLElement = HTMLElement;
    const wrapperForTheName = {
      HTMLElement: function HTMLElement2() {
        return Reflect.construct(BuiltInHTMLElement, [], this.constructor);
      }
    };
    window.HTMLElement = wrapperForTheName["HTMLElement"];
    HTMLElement.prototype = BuiltInHTMLElement.prototype;
    HTMLElement.prototype.constructor = HTMLElement;
    Object.setPrototypeOf(HTMLElement, BuiltInHTMLElement);
  })();
  (function(prototype) {
    if (typeof prototype.requestSubmit == "function")
      return;
    prototype.requestSubmit = function(submitter) {
      if (submitter) {
        validateSubmitter(submitter, this);
        submitter.click();
      } else {
        submitter = document.createElement("input");
        submitter.type = "submit";
        submitter.hidden = true;
        this.appendChild(submitter);
        submitter.click();
        this.removeChild(submitter);
      }
    };
    function validateSubmitter(submitter, form) {
      submitter instanceof HTMLElement || raise(TypeError, "parameter 1 is not of type 'HTMLElement'");
      submitter.type == "submit" || raise(TypeError, "The specified element is not a submit button");
      submitter.form == form || raise(DOMException, "The specified element is not owned by this form element", "NotFoundError");
    }
    function raise(errorConstructor, message, name) {
      throw new errorConstructor("Failed to execute 'requestSubmit' on 'HTMLFormElement': " + message + ".", name);
    }
  })(HTMLFormElement.prototype);
  var submittersByForm = /* @__PURE__ */ new WeakMap();
  function findSubmitterFromClickTarget(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const candidate = element ? element.closest("input, button") : null;
    return (candidate === null || candidate === void 0 ? void 0 : candidate.type) == "submit" ? candidate : null;
  }
  function clickCaptured(event) {
    const submitter = findSubmitterFromClickTarget(event.target);
    if (submitter && submitter.form) {
      submittersByForm.set(submitter.form, submitter);
    }
  }
  (function() {
    if ("submitter" in Event.prototype)
      return;
    let prototype;
    if ("SubmitEvent" in window && /Apple Computer/.test(navigator.vendor)) {
      prototype = window.SubmitEvent.prototype;
    } else if ("SubmitEvent" in window) {
      return;
    } else {
      prototype = window.Event.prototype;
    }
    addEventListener("click", clickCaptured, true);
    Object.defineProperty(prototype, "submitter", {
      get() {
        if (this.type == "submit" && this.target instanceof HTMLFormElement) {
          return submittersByForm.get(this.target);
        }
      }
    });
  })();
  var FrameLoadingStyle;
  (function(FrameLoadingStyle2) {
    FrameLoadingStyle2["eager"] = "eager";
    FrameLoadingStyle2["lazy"] = "lazy";
  })(FrameLoadingStyle || (FrameLoadingStyle = {}));
  var FrameElement = class extends HTMLElement {
    constructor() {
      super();
      this.loaded = Promise.resolve();
      this.delegate = new FrameElement.delegateConstructor(this);
    }
    static get observedAttributes() {
      return ["disabled", "complete", "loading", "src"];
    }
    connectedCallback() {
      this.delegate.connect();
    }
    disconnectedCallback() {
      this.delegate.disconnect();
    }
    reload() {
      return this.delegate.sourceURLReloaded();
    }
    attributeChangedCallback(name) {
      if (name == "loading") {
        this.delegate.loadingStyleChanged();
      } else if (name == "complete") {
        this.delegate.completeChanged();
      } else if (name == "src") {
        this.delegate.sourceURLChanged();
      } else {
        this.delegate.disabledChanged();
      }
    }
    get src() {
      return this.getAttribute("src");
    }
    set src(value) {
      if (value) {
        this.setAttribute("src", value);
      } else {
        this.removeAttribute("src");
      }
    }
    get loading() {
      return frameLoadingStyleFromString(this.getAttribute("loading") || "");
    }
    set loading(value) {
      if (value) {
        this.setAttribute("loading", value);
      } else {
        this.removeAttribute("loading");
      }
    }
    get disabled() {
      return this.hasAttribute("disabled");
    }
    set disabled(value) {
      if (value) {
        this.setAttribute("disabled", "");
      } else {
        this.removeAttribute("disabled");
      }
    }
    get autoscroll() {
      return this.hasAttribute("autoscroll");
    }
    set autoscroll(value) {
      if (value) {
        this.setAttribute("autoscroll", "");
      } else {
        this.removeAttribute("autoscroll");
      }
    }
    get complete() {
      return !this.delegate.isLoading;
    }
    get isActive() {
      return this.ownerDocument === document && !this.isPreview;
    }
    get isPreview() {
      var _a, _b;
      return (_b = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute("data-turbo-preview");
    }
  };
  function frameLoadingStyleFromString(style) {
    switch (style.toLowerCase()) {
      case "lazy":
        return FrameLoadingStyle.lazy;
      default:
        return FrameLoadingStyle.eager;
    }
  }
  function expandURL(locatable) {
    return new URL(locatable.toString(), document.baseURI);
  }
  function getAnchor(url) {
    let anchorMatch;
    if (url.hash) {
      return url.hash.slice(1);
    } else if (anchorMatch = url.href.match(/#(.*)$/)) {
      return anchorMatch[1];
    }
  }
  function getAction(form, submitter) {
    const action = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formaction")) || form.getAttribute("action") || form.action;
    return expandURL(action);
  }
  function getExtension(url) {
    return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || "";
  }
  function isHTML(url) {
    return !!getExtension(url).match(/^(?:|\.(?:htm|html|xhtml|php))$/);
  }
  function isPrefixedBy(baseURL, url) {
    const prefix = getPrefix(url);
    return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix);
  }
  function locationIsVisitable(location2, rootLocation) {
    return isPrefixedBy(location2, rootLocation) && isHTML(location2);
  }
  function getRequestURL(url) {
    const anchor = getAnchor(url);
    return anchor != null ? url.href.slice(0, -(anchor.length + 1)) : url.href;
  }
  function toCacheKey(url) {
    return getRequestURL(url);
  }
  function urlsAreEqual(left, right) {
    return expandURL(left).href == expandURL(right).href;
  }
  function getPathComponents(url) {
    return url.pathname.split("/").slice(1);
  }
  function getLastPathComponent(url) {
    return getPathComponents(url).slice(-1)[0];
  }
  function getPrefix(url) {
    return addTrailingSlash(url.origin + url.pathname);
  }
  function addTrailingSlash(value) {
    return value.endsWith("/") ? value : value + "/";
  }
  var FetchResponse = class {
    constructor(response) {
      this.response = response;
    }
    get succeeded() {
      return this.response.ok;
    }
    get failed() {
      return !this.succeeded;
    }
    get clientError() {
      return this.statusCode >= 400 && this.statusCode <= 499;
    }
    get serverError() {
      return this.statusCode >= 500 && this.statusCode <= 599;
    }
    get redirected() {
      return this.response.redirected;
    }
    get location() {
      return expandURL(this.response.url);
    }
    get isHTML() {
      return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/);
    }
    get statusCode() {
      return this.response.status;
    }
    get contentType() {
      return this.header("Content-Type");
    }
    get responseText() {
      return this.response.clone().text();
    }
    get responseHTML() {
      if (this.isHTML) {
        return this.response.clone().text();
      } else {
        return Promise.resolve(void 0);
      }
    }
    header(name) {
      return this.response.headers.get(name);
    }
  };
  function activateScriptElement(element) {
    if (element.getAttribute("data-turbo-eval") == "false") {
      return element;
    } else {
      const createdScriptElement = document.createElement("script");
      const cspNonce = getMetaContent("csp-nonce");
      if (cspNonce) {
        createdScriptElement.nonce = cspNonce;
      }
      createdScriptElement.textContent = element.textContent;
      createdScriptElement.async = false;
      copyElementAttributes(createdScriptElement, element);
      return createdScriptElement;
    }
  }
  function copyElementAttributes(destinationElement, sourceElement) {
    for (const { name, value } of sourceElement.attributes) {
      destinationElement.setAttribute(name, value);
    }
  }
  function createDocumentFragment(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
  }
  function dispatch(eventName, { target, cancelable, detail } = {}) {
    const event = new CustomEvent(eventName, {
      cancelable,
      bubbles: true,
      composed: true,
      detail
    });
    if (target && target.isConnected) {
      target.dispatchEvent(event);
    } else {
      document.documentElement.dispatchEvent(event);
    }
    return event;
  }
  function nextAnimationFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  function nextEventLoopTick() {
    return new Promise((resolve) => setTimeout(() => resolve(), 0));
  }
  function nextMicrotask() {
    return Promise.resolve();
  }
  function parseHTMLDocument(html = "") {
    return new DOMParser().parseFromString(html, "text/html");
  }
  function unindent(strings, ...values) {
    const lines = interpolate(strings, values).replace(/^\n/, "").split("\n");
    const match = lines[0].match(/^\s+/);
    const indent = match ? match[0].length : 0;
    return lines.map((line) => line.slice(indent)).join("\n");
  }
  function interpolate(strings, values) {
    return strings.reduce((result, string, i) => {
      const value = values[i] == void 0 ? "" : values[i];
      return result + string + value;
    }, "");
  }
  function uuid() {
    return Array.from({ length: 36 }).map((_, i) => {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        return "-";
      } else if (i == 14) {
        return "4";
      } else if (i == 19) {
        return (Math.floor(Math.random() * 4) + 8).toString(16);
      } else {
        return Math.floor(Math.random() * 15).toString(16);
      }
    }).join("");
  }
  function getAttribute(attributeName, ...elements) {
    for (const value of elements.map((element) => element === null || element === void 0 ? void 0 : element.getAttribute(attributeName))) {
      if (typeof value == "string")
        return value;
    }
    return null;
  }
  function hasAttribute(attributeName, ...elements) {
    return elements.some((element) => element && element.hasAttribute(attributeName));
  }
  function markAsBusy(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.setAttribute("busy", "");
      }
      element.setAttribute("aria-busy", "true");
    }
  }
  function clearBusyState(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.removeAttribute("busy");
      }
      element.removeAttribute("aria-busy");
    }
  }
  function waitForLoad(element, timeoutInMilliseconds = 2e3) {
    return new Promise((resolve) => {
      const onComplete = () => {
        element.removeEventListener("error", onComplete);
        element.removeEventListener("load", onComplete);
        resolve();
      };
      element.addEventListener("load", onComplete, { once: true });
      element.addEventListener("error", onComplete, { once: true });
      setTimeout(resolve, timeoutInMilliseconds);
    });
  }
  function getHistoryMethodForAction(action) {
    switch (action) {
      case "replace":
        return history.replaceState;
      case "advance":
      case "restore":
        return history.pushState;
    }
  }
  function isAction(action) {
    return action == "advance" || action == "replace" || action == "restore";
  }
  function getVisitAction(...elements) {
    const action = getAttribute("data-turbo-action", ...elements);
    return isAction(action) ? action : null;
  }
  function getMetaElement(name) {
    return document.querySelector(`meta[name="${name}"]`);
  }
  function getMetaContent(name) {
    const element = getMetaElement(name);
    return element && element.content;
  }
  function setMetaContent(name, content) {
    let element = getMetaElement(name);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("name", name);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
    return element;
  }
  function findClosestRecursively(element, selector) {
    var _a;
    if (element instanceof Element) {
      return element.closest(selector) || findClosestRecursively(element.assignedSlot || ((_a = element.getRootNode()) === null || _a === void 0 ? void 0 : _a.host), selector);
    }
  }
  var FetchMethod;
  (function(FetchMethod2) {
    FetchMethod2[FetchMethod2["get"] = 0] = "get";
    FetchMethod2[FetchMethod2["post"] = 1] = "post";
    FetchMethod2[FetchMethod2["put"] = 2] = "put";
    FetchMethod2[FetchMethod2["patch"] = 3] = "patch";
    FetchMethod2[FetchMethod2["delete"] = 4] = "delete";
  })(FetchMethod || (FetchMethod = {}));
  function fetchMethodFromString(method) {
    switch (method.toLowerCase()) {
      case "get":
        return FetchMethod.get;
      case "post":
        return FetchMethod.post;
      case "put":
        return FetchMethod.put;
      case "patch":
        return FetchMethod.patch;
      case "delete":
        return FetchMethod.delete;
    }
  }
  var FetchRequest = class {
    constructor(delegate, method, location2, body = new URLSearchParams(), target = null) {
      this.abortController = new AbortController();
      this.resolveRequestPromise = (_value) => {
      };
      this.delegate = delegate;
      this.method = method;
      this.headers = this.defaultHeaders;
      this.body = body;
      this.url = location2;
      this.target = target;
    }
    get location() {
      return this.url;
    }
    get params() {
      return this.url.searchParams;
    }
    get entries() {
      return this.body ? Array.from(this.body.entries()) : [];
    }
    cancel() {
      this.abortController.abort();
    }
    async perform() {
      const { fetchOptions } = this;
      this.delegate.prepareRequest(this);
      await this.allowRequestToBeIntercepted(fetchOptions);
      try {
        this.delegate.requestStarted(this);
        const response = await fetch(this.url.href, fetchOptions);
        return await this.receive(response);
      } catch (error2) {
        if (error2.name !== "AbortError") {
          if (this.willDelegateErrorHandling(error2)) {
            this.delegate.requestErrored(this, error2);
          }
          throw error2;
        }
      } finally {
        this.delegate.requestFinished(this);
      }
    }
    async receive(response) {
      const fetchResponse = new FetchResponse(response);
      const event = dispatch("turbo:before-fetch-response", {
        cancelable: true,
        detail: { fetchResponse },
        target: this.target
      });
      if (event.defaultPrevented) {
        this.delegate.requestPreventedHandlingResponse(this, fetchResponse);
      } else if (fetchResponse.succeeded) {
        this.delegate.requestSucceededWithResponse(this, fetchResponse);
      } else {
        this.delegate.requestFailedWithResponse(this, fetchResponse);
      }
      return fetchResponse;
    }
    get fetchOptions() {
      var _a;
      return {
        method: FetchMethod[this.method].toUpperCase(),
        credentials: "same-origin",
        headers: this.headers,
        redirect: "follow",
        body: this.isIdempotent ? null : this.body,
        signal: this.abortSignal,
        referrer: (_a = this.delegate.referrer) === null || _a === void 0 ? void 0 : _a.href
      };
    }
    get defaultHeaders() {
      return {
        Accept: "text/html, application/xhtml+xml"
      };
    }
    get isIdempotent() {
      return this.method == FetchMethod.get;
    }
    get abortSignal() {
      return this.abortController.signal;
    }
    acceptResponseType(mimeType) {
      this.headers["Accept"] = [mimeType, this.headers["Accept"]].join(", ");
    }
    async allowRequestToBeIntercepted(fetchOptions) {
      const requestInterception = new Promise((resolve) => this.resolveRequestPromise = resolve);
      const event = dispatch("turbo:before-fetch-request", {
        cancelable: true,
        detail: {
          fetchOptions,
          url: this.url,
          resume: this.resolveRequestPromise
        },
        target: this.target
      });
      if (event.defaultPrevented)
        await requestInterception;
    }
    willDelegateErrorHandling(error2) {
      const event = dispatch("turbo:fetch-request-error", {
        target: this.target,
        cancelable: true,
        detail: { request: this, error: error2 }
      });
      return !event.defaultPrevented;
    }
  };
  var AppearanceObserver = class {
    constructor(delegate, element) {
      this.started = false;
      this.intersect = (entries) => {
        const lastEntry = entries.slice(-1)[0];
        if (lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.isIntersecting) {
          this.delegate.elementAppearedInViewport(this.element);
        }
      };
      this.delegate = delegate;
      this.element = element;
      this.intersectionObserver = new IntersectionObserver(this.intersect);
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.intersectionObserver.observe(this.element);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.intersectionObserver.unobserve(this.element);
      }
    }
  };
  var StreamMessage = class {
    constructor(fragment) {
      this.fragment = importStreamElements(fragment);
    }
    static wrap(message) {
      if (typeof message == "string") {
        return new this(createDocumentFragment(message));
      } else {
        return message;
      }
    }
  };
  StreamMessage.contentType = "text/vnd.turbo-stream.html";
  function importStreamElements(fragment) {
    for (const element of fragment.querySelectorAll("turbo-stream")) {
      const streamElement = document.importNode(element, true);
      for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll("script")) {
        inertScriptElement.replaceWith(activateScriptElement(inertScriptElement));
      }
      element.replaceWith(streamElement);
    }
    return fragment;
  }
  var FormSubmissionState;
  (function(FormSubmissionState2) {
    FormSubmissionState2[FormSubmissionState2["initialized"] = 0] = "initialized";
    FormSubmissionState2[FormSubmissionState2["requesting"] = 1] = "requesting";
    FormSubmissionState2[FormSubmissionState2["waiting"] = 2] = "waiting";
    FormSubmissionState2[FormSubmissionState2["receiving"] = 3] = "receiving";
    FormSubmissionState2[FormSubmissionState2["stopping"] = 4] = "stopping";
    FormSubmissionState2[FormSubmissionState2["stopped"] = 5] = "stopped";
  })(FormSubmissionState || (FormSubmissionState = {}));
  var FormEnctype;
  (function(FormEnctype2) {
    FormEnctype2["urlEncoded"] = "application/x-www-form-urlencoded";
    FormEnctype2["multipart"] = "multipart/form-data";
    FormEnctype2["plain"] = "text/plain";
  })(FormEnctype || (FormEnctype = {}));
  function formEnctypeFromString(encoding) {
    switch (encoding.toLowerCase()) {
      case FormEnctype.multipart:
        return FormEnctype.multipart;
      case FormEnctype.plain:
        return FormEnctype.plain;
      default:
        return FormEnctype.urlEncoded;
    }
  }
  var FormSubmission = class {
    constructor(delegate, formElement, submitter, mustRedirect = false) {
      this.state = FormSubmissionState.initialized;
      this.delegate = delegate;
      this.formElement = formElement;
      this.submitter = submitter;
      this.formData = buildFormData(formElement, submitter);
      this.location = expandURL(this.action);
      if (this.method == FetchMethod.get) {
        mergeFormDataEntries(this.location, [...this.body.entries()]);
      }
      this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement);
      this.mustRedirect = mustRedirect;
    }
    static confirmMethod(message, _element, _submitter) {
      return Promise.resolve(confirm(message));
    }
    get method() {
      var _a;
      const method = ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formmethod")) || this.formElement.getAttribute("method") || "";
      return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get;
    }
    get action() {
      var _a;
      const formElementAction = typeof this.formElement.action === "string" ? this.formElement.action : null;
      if ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.hasAttribute("formaction")) {
        return this.submitter.getAttribute("formaction") || "";
      } else {
        return this.formElement.getAttribute("action") || formElementAction || "";
      }
    }
    get body() {
      if (this.enctype == FormEnctype.urlEncoded || this.method == FetchMethod.get) {
        return new URLSearchParams(this.stringFormData);
      } else {
        return this.formData;
      }
    }
    get enctype() {
      var _a;
      return formEnctypeFromString(((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formenctype")) || this.formElement.enctype);
    }
    get isIdempotent() {
      return this.fetchRequest.isIdempotent;
    }
    get stringFormData() {
      return [...this.formData].reduce((entries, [name, value]) => {
        return entries.concat(typeof value == "string" ? [[name, value]] : []);
      }, []);
    }
    async start() {
      const { initialized, requesting } = FormSubmissionState;
      const confirmationMessage = getAttribute("data-turbo-confirm", this.submitter, this.formElement);
      if (typeof confirmationMessage === "string") {
        const answer = await FormSubmission.confirmMethod(confirmationMessage, this.formElement, this.submitter);
        if (!answer) {
          return;
        }
      }
      if (this.state == initialized) {
        this.state = requesting;
        return this.fetchRequest.perform();
      }
    }
    stop() {
      const { stopping, stopped } = FormSubmissionState;
      if (this.state != stopping && this.state != stopped) {
        this.state = stopping;
        this.fetchRequest.cancel();
        return true;
      }
    }
    prepareRequest(request) {
      if (!request.isIdempotent) {
        const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token");
        if (token) {
          request.headers["X-CSRF-Token"] = token;
        }
      }
      if (this.requestAcceptsTurboStreamResponse(request)) {
        request.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      var _a;
      this.state = FormSubmissionState.waiting;
      (_a = this.submitter) === null || _a === void 0 ? void 0 : _a.setAttribute("disabled", "");
      dispatch("turbo:submit-start", {
        target: this.formElement,
        detail: { formSubmission: this }
      });
      this.delegate.formSubmissionStarted(this);
    }
    requestPreventedHandlingResponse(request, response) {
      this.result = { success: response.succeeded, fetchResponse: response };
    }
    requestSucceededWithResponse(request, response) {
      if (response.clientError || response.serverError) {
        this.delegate.formSubmissionFailedWithResponse(this, response);
      } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
        const error2 = new Error("Form responses must redirect to another location");
        this.delegate.formSubmissionErrored(this, error2);
      } else {
        this.state = FormSubmissionState.receiving;
        this.result = { success: true, fetchResponse: response };
        this.delegate.formSubmissionSucceededWithResponse(this, response);
      }
    }
    requestFailedWithResponse(request, response) {
      this.result = { success: false, fetchResponse: response };
      this.delegate.formSubmissionFailedWithResponse(this, response);
    }
    requestErrored(request, error2) {
      this.result = { success: false, error: error2 };
      this.delegate.formSubmissionErrored(this, error2);
    }
    requestFinished(_request) {
      var _a;
      this.state = FormSubmissionState.stopped;
      (_a = this.submitter) === null || _a === void 0 ? void 0 : _a.removeAttribute("disabled");
      dispatch("turbo:submit-end", {
        target: this.formElement,
        detail: Object.assign({ formSubmission: this }, this.result)
      });
      this.delegate.formSubmissionFinished(this);
    }
    requestMustRedirect(request) {
      return !request.isIdempotent && this.mustRedirect;
    }
    requestAcceptsTurboStreamResponse(request) {
      return !request.isIdempotent || hasAttribute("data-turbo-stream", this.submitter, this.formElement);
    }
  };
  function buildFormData(formElement, submitter) {
    const formData = new FormData(formElement);
    const name = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("name");
    const value = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("value");
    if (name) {
      formData.append(name, value || "");
    }
    return formData;
  }
  function getCookieValue(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
      if (cookie) {
        const value = cookie.split("=").slice(1).join("=");
        return value ? decodeURIComponent(value) : void 0;
      }
    }
  }
  function responseSucceededWithoutRedirect(response) {
    return response.statusCode == 200 && !response.redirected;
  }
  function mergeFormDataEntries(url, entries) {
    const searchParams = new URLSearchParams();
    for (const [name, value] of entries) {
      if (value instanceof File)
        continue;
      searchParams.append(name, value);
    }
    url.search = searchParams.toString();
    return url;
  }
  var Snapshot = class {
    constructor(element) {
      this.element = element;
    }
    get activeElement() {
      return this.element.ownerDocument.activeElement;
    }
    get children() {
      return [...this.element.children];
    }
    hasAnchor(anchor) {
      return this.getElementForAnchor(anchor) != null;
    }
    getElementForAnchor(anchor) {
      return anchor ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`) : null;
    }
    get isConnected() {
      return this.element.isConnected;
    }
    get firstAutofocusableElement() {
      const inertDisabledOrHidden = "[inert], :disabled, [hidden], details:not([open]), dialog:not([open])";
      for (const element of this.element.querySelectorAll("[autofocus]")) {
        if (element.closest(inertDisabledOrHidden) == null)
          return element;
        else
          continue;
      }
      return null;
    }
    get permanentElements() {
      return queryPermanentElementsAll(this.element);
    }
    getPermanentElementById(id) {
      return getPermanentElementById(this.element, id);
    }
    getPermanentElementMapForSnapshot(snapshot) {
      const permanentElementMap = {};
      for (const currentPermanentElement of this.permanentElements) {
        const { id } = currentPermanentElement;
        const newPermanentElement = snapshot.getPermanentElementById(id);
        if (newPermanentElement) {
          permanentElementMap[id] = [currentPermanentElement, newPermanentElement];
        }
      }
      return permanentElementMap;
    }
  };
  function getPermanentElementById(node, id) {
    return node.querySelector(`#${id}[data-turbo-permanent]`);
  }
  function queryPermanentElementsAll(node) {
    return node.querySelectorAll("[id][data-turbo-permanent]");
  }
  var FormSubmitObserver = class {
    constructor(delegate, eventTarget) {
      this.started = false;
      this.submitCaptured = () => {
        this.eventTarget.removeEventListener("submit", this.submitBubbled, false);
        this.eventTarget.addEventListener("submit", this.submitBubbled, false);
      };
      this.submitBubbled = (event) => {
        if (!event.defaultPrevented) {
          const form = event.target instanceof HTMLFormElement ? event.target : void 0;
          const submitter = event.submitter || void 0;
          if (form && submissionDoesNotDismissDialog(form, submitter) && submissionDoesNotTargetIFrame(form, submitter) && this.delegate.willSubmitForm(form, submitter)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.delegate.formSubmitted(form, submitter);
          }
        }
      };
      this.delegate = delegate;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("submit", this.submitCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("submit", this.submitCaptured, true);
        this.started = false;
      }
    }
  };
  function submissionDoesNotDismissDialog(form, submitter) {
    const method = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formmethod")) || form.getAttribute("method");
    return method != "dialog";
  }
  function submissionDoesNotTargetIFrame(form, submitter) {
    if ((submitter === null || submitter === void 0 ? void 0 : submitter.hasAttribute("formtarget")) || form.hasAttribute("target")) {
      const target = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formtarget")) || form.target;
      for (const element of document.getElementsByName(target)) {
        if (element instanceof HTMLIFrameElement)
          return false;
      }
      return true;
    } else {
      return true;
    }
  }
  var View = class {
    constructor(delegate, element) {
      this.resolveRenderPromise = (_value) => {
      };
      this.resolveInterceptionPromise = (_value) => {
      };
      this.delegate = delegate;
      this.element = element;
    }
    scrollToAnchor(anchor) {
      const element = this.snapshot.getElementForAnchor(anchor);
      if (element) {
        this.scrollToElement(element);
        this.focusElement(element);
      } else {
        this.scrollToPosition({ x: 0, y: 0 });
      }
    }
    scrollToAnchorFromLocation(location2) {
      this.scrollToAnchor(getAnchor(location2));
    }
    scrollToElement(element) {
      element.scrollIntoView();
    }
    focusElement(element) {
      if (element instanceof HTMLElement) {
        if (element.hasAttribute("tabindex")) {
          element.focus();
        } else {
          element.setAttribute("tabindex", "-1");
          element.focus();
          element.removeAttribute("tabindex");
        }
      }
    }
    scrollToPosition({ x, y }) {
      this.scrollRoot.scrollTo(x, y);
    }
    scrollToTop() {
      this.scrollToPosition({ x: 0, y: 0 });
    }
    get scrollRoot() {
      return window;
    }
    async render(renderer) {
      const { isPreview, shouldRender, newSnapshot: snapshot } = renderer;
      if (shouldRender) {
        try {
          this.renderPromise = new Promise((resolve) => this.resolveRenderPromise = resolve);
          this.renderer = renderer;
          await this.prepareToRenderSnapshot(renderer);
          const renderInterception = new Promise((resolve) => this.resolveInterceptionPromise = resolve);
          const options = { resume: this.resolveInterceptionPromise, render: this.renderer.renderElement };
          const immediateRender = this.delegate.allowsImmediateRender(snapshot, options);
          if (!immediateRender)
            await renderInterception;
          await this.renderSnapshot(renderer);
          this.delegate.viewRenderedSnapshot(snapshot, isPreview);
          this.delegate.preloadOnLoadLinksForView(this.element);
          this.finishRenderingSnapshot(renderer);
        } finally {
          delete this.renderer;
          this.resolveRenderPromise(void 0);
          delete this.renderPromise;
        }
      } else {
        this.invalidate(renderer.reloadReason);
      }
    }
    invalidate(reason) {
      this.delegate.viewInvalidated(reason);
    }
    async prepareToRenderSnapshot(renderer) {
      this.markAsPreview(renderer.isPreview);
      await renderer.prepareToRender();
    }
    markAsPreview(isPreview) {
      if (isPreview) {
        this.element.setAttribute("data-turbo-preview", "");
      } else {
        this.element.removeAttribute("data-turbo-preview");
      }
    }
    async renderSnapshot(renderer) {
      await renderer.render();
    }
    finishRenderingSnapshot(renderer) {
      renderer.finishRendering();
    }
  };
  var FrameView = class extends View {
    invalidate() {
      this.element.innerHTML = "";
    }
    get snapshot() {
      return new Snapshot(this.element);
    }
  };
  var LinkInterceptor = class {
    constructor(delegate, element) {
      this.clickBubbled = (event) => {
        if (this.respondsToEventTarget(event.target)) {
          this.clickEvent = event;
        } else {
          delete this.clickEvent;
        }
      };
      this.linkClicked = (event) => {
        if (this.clickEvent && this.respondsToEventTarget(event.target) && event.target instanceof Element) {
          if (this.delegate.shouldInterceptLinkClick(event.target, event.detail.url, event.detail.originalEvent)) {
            this.clickEvent.preventDefault();
            event.preventDefault();
            this.delegate.linkClickIntercepted(event.target, event.detail.url, event.detail.originalEvent);
          }
        }
        delete this.clickEvent;
      };
      this.willVisit = (_event) => {
        delete this.clickEvent;
      };
      this.delegate = delegate;
      this.element = element;
    }
    start() {
      this.element.addEventListener("click", this.clickBubbled);
      document.addEventListener("turbo:click", this.linkClicked);
      document.addEventListener("turbo:before-visit", this.willVisit);
    }
    stop() {
      this.element.removeEventListener("click", this.clickBubbled);
      document.removeEventListener("turbo:click", this.linkClicked);
      document.removeEventListener("turbo:before-visit", this.willVisit);
    }
    respondsToEventTarget(target) {
      const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
      return element && element.closest("turbo-frame, html") == this.element;
    }
  };
  var LinkClickObserver = class {
    constructor(delegate, eventTarget) {
      this.started = false;
      this.clickCaptured = () => {
        this.eventTarget.removeEventListener("click", this.clickBubbled, false);
        this.eventTarget.addEventListener("click", this.clickBubbled, false);
      };
      this.clickBubbled = (event) => {
        if (event instanceof MouseEvent && this.clickEventIsSignificant(event)) {
          const target = event.composedPath && event.composedPath()[0] || event.target;
          const link = this.findLinkFromClickTarget(target);
          if (link && doesNotTargetIFrame(link)) {
            const location2 = this.getLocationForLink(link);
            if (this.delegate.willFollowLinkToLocation(link, location2, event)) {
              event.preventDefault();
              this.delegate.followedLinkToLocation(link, location2);
            }
          }
        }
      };
      this.delegate = delegate;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("click", this.clickCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("click", this.clickCaptured, true);
        this.started = false;
      }
    }
    clickEventIsSignificant(event) {
      return !(event.target && event.target.isContentEditable || event.defaultPrevented || event.which > 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
    }
    findLinkFromClickTarget(target) {
      return findClosestRecursively(target, "a[href]:not([target^=_]):not([download])");
    }
    getLocationForLink(link) {
      return expandURL(link.getAttribute("href") || "");
    }
  };
  function doesNotTargetIFrame(anchor) {
    if (anchor.hasAttribute("target")) {
      for (const element of document.getElementsByName(anchor.target)) {
        if (element instanceof HTMLIFrameElement)
          return false;
      }
      return true;
    } else {
      return true;
    }
  }
  var FormLinkClickObserver = class {
    constructor(delegate, element) {
      this.delegate = delegate;
      this.linkInterceptor = new LinkClickObserver(this, element);
    }
    start() {
      this.linkInterceptor.start();
    }
    stop() {
      this.linkInterceptor.stop();
    }
    willFollowLinkToLocation(link, location2, originalEvent) {
      return this.delegate.willSubmitFormLinkToLocation(link, location2, originalEvent) && link.hasAttribute("data-turbo-method");
    }
    followedLinkToLocation(link, location2) {
      const form = document.createElement("form");
      const type = "hidden";
      for (const [name, value] of location2.searchParams) {
        form.append(Object.assign(document.createElement("input"), { type, name, value }));
      }
      const action = Object.assign(location2, { search: "" });
      form.setAttribute("data-turbo", "true");
      form.setAttribute("action", action.href);
      form.setAttribute("hidden", "");
      const method = link.getAttribute("data-turbo-method");
      if (method)
        form.setAttribute("method", method);
      const turboFrame = link.getAttribute("data-turbo-frame");
      if (turboFrame)
        form.setAttribute("data-turbo-frame", turboFrame);
      const turboAction = getVisitAction(link);
      if (turboAction)
        form.setAttribute("data-turbo-action", turboAction);
      const turboConfirm = link.getAttribute("data-turbo-confirm");
      if (turboConfirm)
        form.setAttribute("data-turbo-confirm", turboConfirm);
      const turboStream = link.hasAttribute("data-turbo-stream");
      if (turboStream)
        form.setAttribute("data-turbo-stream", "");
      this.delegate.submittedFormLinkToLocation(link, location2, form);
      document.body.appendChild(form);
      form.addEventListener("turbo:submit-end", () => form.remove(), { once: true });
      requestAnimationFrame(() => form.requestSubmit());
    }
  };
  var Bardo = class {
    constructor(delegate, permanentElementMap) {
      this.delegate = delegate;
      this.permanentElementMap = permanentElementMap;
    }
    static async preservingPermanentElements(delegate, permanentElementMap, callback) {
      const bardo = new this(delegate, permanentElementMap);
      bardo.enter();
      await callback();
      bardo.leave();
    }
    enter() {
      for (const id in this.permanentElementMap) {
        const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id];
        this.delegate.enteringBardo(currentPermanentElement, newPermanentElement);
        this.replaceNewPermanentElementWithPlaceholder(newPermanentElement);
      }
    }
    leave() {
      for (const id in this.permanentElementMap) {
        const [currentPermanentElement] = this.permanentElementMap[id];
        this.replaceCurrentPermanentElementWithClone(currentPermanentElement);
        this.replacePlaceholderWithPermanentElement(currentPermanentElement);
        this.delegate.leavingBardo(currentPermanentElement);
      }
    }
    replaceNewPermanentElementWithPlaceholder(permanentElement) {
      const placeholder = createPlaceholderForPermanentElement(permanentElement);
      permanentElement.replaceWith(placeholder);
    }
    replaceCurrentPermanentElementWithClone(permanentElement) {
      const clone = permanentElement.cloneNode(true);
      permanentElement.replaceWith(clone);
    }
    replacePlaceholderWithPermanentElement(permanentElement) {
      const placeholder = this.getPlaceholderById(permanentElement.id);
      placeholder === null || placeholder === void 0 ? void 0 : placeholder.replaceWith(permanentElement);
    }
    getPlaceholderById(id) {
      return this.placeholders.find((element) => element.content == id);
    }
    get placeholders() {
      return [...document.querySelectorAll("meta[name=turbo-permanent-placeholder][content]")];
    }
  };
  function createPlaceholderForPermanentElement(permanentElement) {
    const element = document.createElement("meta");
    element.setAttribute("name", "turbo-permanent-placeholder");
    element.setAttribute("content", permanentElement.id);
    return element;
  }
  var Renderer = class {
    constructor(currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      this.activeElement = null;
      this.currentSnapshot = currentSnapshot;
      this.newSnapshot = newSnapshot;
      this.isPreview = isPreview;
      this.willRender = willRender;
      this.renderElement = renderElement;
      this.promise = new Promise((resolve, reject) => this.resolvingFunctions = { resolve, reject });
    }
    get shouldRender() {
      return true;
    }
    get reloadReason() {
      return;
    }
    prepareToRender() {
      return;
    }
    finishRendering() {
      if (this.resolvingFunctions) {
        this.resolvingFunctions.resolve();
        delete this.resolvingFunctions;
      }
    }
    async preservingPermanentElements(callback) {
      await Bardo.preservingPermanentElements(this, this.permanentElementMap, callback);
    }
    focusFirstAutofocusableElement() {
      const element = this.connectedSnapshot.firstAutofocusableElement;
      if (elementIsFocusable(element)) {
        element.focus();
      }
    }
    enteringBardo(currentPermanentElement) {
      if (this.activeElement)
        return;
      if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
        this.activeElement = this.currentSnapshot.activeElement;
      }
    }
    leavingBardo(currentPermanentElement) {
      if (currentPermanentElement.contains(this.activeElement) && this.activeElement instanceof HTMLElement) {
        this.activeElement.focus();
        this.activeElement = null;
      }
    }
    get connectedSnapshot() {
      return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot;
    }
    get currentElement() {
      return this.currentSnapshot.element;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    get permanentElementMap() {
      return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot);
    }
  };
  function elementIsFocusable(element) {
    return element && typeof element.focus == "function";
  }
  var FrameRenderer = class extends Renderer {
    constructor(delegate, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender);
      this.delegate = delegate;
    }
    static renderElement(currentElement, newElement) {
      var _a;
      const destinationRange = document.createRange();
      destinationRange.selectNodeContents(currentElement);
      destinationRange.deleteContents();
      const frameElement = newElement;
      const sourceRange = (_a = frameElement.ownerDocument) === null || _a === void 0 ? void 0 : _a.createRange();
      if (sourceRange) {
        sourceRange.selectNodeContents(frameElement);
        currentElement.appendChild(sourceRange.extractContents());
      }
    }
    get shouldRender() {
      return true;
    }
    async render() {
      await nextAnimationFrame();
      this.preservingPermanentElements(() => {
        this.loadFrameElement();
      });
      this.scrollFrameIntoView();
      await nextAnimationFrame();
      this.focusFirstAutofocusableElement();
      await nextAnimationFrame();
      this.activateScriptElements();
    }
    loadFrameElement() {
      this.delegate.willRenderFrame(this.currentElement, this.newElement);
      this.renderElement(this.currentElement, this.newElement);
    }
    scrollFrameIntoView() {
      if (this.currentElement.autoscroll || this.newElement.autoscroll) {
        const element = this.currentElement.firstElementChild;
        const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end");
        const behavior = readScrollBehavior(this.currentElement.getAttribute("data-autoscroll-behavior"), "auto");
        if (element) {
          element.scrollIntoView({ block, behavior });
          return true;
        }
      }
      return false;
    }
    activateScriptElements() {
      for (const inertScriptElement of this.newScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    get newScriptElements() {
      return this.currentElement.querySelectorAll("script");
    }
  };
  function readScrollLogicalPosition(value, defaultValue) {
    if (value == "end" || value == "start" || value == "center" || value == "nearest") {
      return value;
    } else {
      return defaultValue;
    }
  }
  function readScrollBehavior(value, defaultValue) {
    if (value == "auto" || value == "smooth") {
      return value;
    } else {
      return defaultValue;
    }
  }
  var ProgressBar = class {
    constructor() {
      this.hiding = false;
      this.value = 0;
      this.visible = false;
      this.trickle = () => {
        this.setValue(this.value + Math.random() / 100);
      };
      this.stylesheetElement = this.createStylesheetElement();
      this.progressElement = this.createProgressElement();
      this.installStylesheetElement();
      this.setValue(0);
    }
    static get defaultCSS() {
      return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        height: 3px;
        background: #0076ff;
        z-index: 2147483647;
        transition:
          width ${ProgressBar.animationDuration}ms ease-out,
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
      }
    `;
    }
    show() {
      if (!this.visible) {
        this.visible = true;
        this.installProgressElement();
        this.startTrickling();
      }
    }
    hide() {
      if (this.visible && !this.hiding) {
        this.hiding = true;
        this.fadeProgressElement(() => {
          this.uninstallProgressElement();
          this.stopTrickling();
          this.visible = false;
          this.hiding = false;
        });
      }
    }
    setValue(value) {
      this.value = value;
      this.refresh();
    }
    installStylesheetElement() {
      document.head.insertBefore(this.stylesheetElement, document.head.firstChild);
    }
    installProgressElement() {
      this.progressElement.style.width = "0";
      this.progressElement.style.opacity = "1";
      document.documentElement.insertBefore(this.progressElement, document.body);
      this.refresh();
    }
    fadeProgressElement(callback) {
      this.progressElement.style.opacity = "0";
      setTimeout(callback, ProgressBar.animationDuration * 1.5);
    }
    uninstallProgressElement() {
      if (this.progressElement.parentNode) {
        document.documentElement.removeChild(this.progressElement);
      }
    }
    startTrickling() {
      if (!this.trickleInterval) {
        this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration);
      }
    }
    stopTrickling() {
      window.clearInterval(this.trickleInterval);
      delete this.trickleInterval;
    }
    refresh() {
      requestAnimationFrame(() => {
        this.progressElement.style.width = `${10 + this.value * 90}%`;
      });
    }
    createStylesheetElement() {
      const element = document.createElement("style");
      element.type = "text/css";
      element.textContent = ProgressBar.defaultCSS;
      if (this.cspNonce) {
        element.nonce = this.cspNonce;
      }
      return element;
    }
    createProgressElement() {
      const element = document.createElement("div");
      element.className = "turbo-progress-bar";
      return element;
    }
    get cspNonce() {
      return getMetaContent("csp-nonce");
    }
  };
  ProgressBar.animationDuration = 300;
  var HeadSnapshot = class extends Snapshot {
    constructor() {
      super(...arguments);
      this.detailsByOuterHTML = this.children.filter((element) => !elementIsNoscript(element)).map((element) => elementWithoutNonce(element)).reduce((result, element) => {
        const { outerHTML } = element;
        const details = outerHTML in result ? result[outerHTML] : {
          type: elementType(element),
          tracked: elementIsTracked(element),
          elements: []
        };
        return Object.assign(Object.assign({}, result), { [outerHTML]: Object.assign(Object.assign({}, details), { elements: [...details.elements, element] }) });
      }, {});
    }
    get trackedElementSignature() {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => this.detailsByOuterHTML[outerHTML].tracked).join("");
    }
    getScriptElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("script", snapshot);
    }
    getStylesheetElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("stylesheet", snapshot);
    }
    getElementsMatchingTypeNotInSnapshot(matchedType, snapshot) {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => !(outerHTML in snapshot.detailsByOuterHTML)).map((outerHTML) => this.detailsByOuterHTML[outerHTML]).filter(({ type }) => type == matchedType).map(({ elements: [element] }) => element);
    }
    get provisionalElements() {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { type, tracked, elements } = this.detailsByOuterHTML[outerHTML];
        if (type == null && !tracked) {
          return [...result, ...elements];
        } else if (elements.length > 1) {
          return [...result, ...elements.slice(1)];
        } else {
          return result;
        }
      }, []);
    }
    getMetaValue(name) {
      const element = this.findMetaElementByName(name);
      return element ? element.getAttribute("content") : null;
    }
    findMetaElementByName(name) {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { elements: [element] } = this.detailsByOuterHTML[outerHTML];
        return elementIsMetaElementWithName(element, name) ? element : result;
      }, void 0);
    }
  };
  function elementType(element) {
    if (elementIsScript(element)) {
      return "script";
    } else if (elementIsStylesheet(element)) {
      return "stylesheet";
    }
  }
  function elementIsTracked(element) {
    return element.getAttribute("data-turbo-track") == "reload";
  }
  function elementIsScript(element) {
    const tagName = element.localName;
    return tagName == "script";
  }
  function elementIsNoscript(element) {
    const tagName = element.localName;
    return tagName == "noscript";
  }
  function elementIsStylesheet(element) {
    const tagName = element.localName;
    return tagName == "style" || tagName == "link" && element.getAttribute("rel") == "stylesheet";
  }
  function elementIsMetaElementWithName(element, name) {
    const tagName = element.localName;
    return tagName == "meta" && element.getAttribute("name") == name;
  }
  function elementWithoutNonce(element) {
    if (element.hasAttribute("nonce")) {
      element.setAttribute("nonce", "");
    }
    return element;
  }
  var PageSnapshot = class extends Snapshot {
    constructor(element, headSnapshot) {
      super(element);
      this.headSnapshot = headSnapshot;
    }
    static fromHTMLString(html = "") {
      return this.fromDocument(parseHTMLDocument(html));
    }
    static fromElement(element) {
      return this.fromDocument(element.ownerDocument);
    }
    static fromDocument({ head, body }) {
      return new this(body, new HeadSnapshot(head));
    }
    clone() {
      const clonedElement = this.element.cloneNode(true);
      const selectElements = this.element.querySelectorAll("select");
      const clonedSelectElements = clonedElement.querySelectorAll("select");
      for (const [index, source] of selectElements.entries()) {
        const clone = clonedSelectElements[index];
        for (const option of clone.selectedOptions)
          option.selected = false;
        for (const option of source.selectedOptions)
          clone.options[option.index].selected = true;
      }
      for (const clonedPasswordInput of clonedElement.querySelectorAll('input[type="password"]')) {
        clonedPasswordInput.value = "";
      }
      return new PageSnapshot(clonedElement, this.headSnapshot);
    }
    get headElement() {
      return this.headSnapshot.element;
    }
    get rootLocation() {
      var _a;
      const root = (_a = this.getSetting("root")) !== null && _a !== void 0 ? _a : "/";
      return expandURL(root);
    }
    get cacheControlValue() {
      return this.getSetting("cache-control");
    }
    get isPreviewable() {
      return this.cacheControlValue != "no-preview";
    }
    get isCacheable() {
      return this.cacheControlValue != "no-cache";
    }
    get isVisitable() {
      return this.getSetting("visit-control") != "reload";
    }
    getSetting(name) {
      return this.headSnapshot.getMetaValue(`turbo-${name}`);
    }
  };
  var TimingMetric;
  (function(TimingMetric2) {
    TimingMetric2["visitStart"] = "visitStart";
    TimingMetric2["requestStart"] = "requestStart";
    TimingMetric2["requestEnd"] = "requestEnd";
    TimingMetric2["visitEnd"] = "visitEnd";
  })(TimingMetric || (TimingMetric = {}));
  var VisitState;
  (function(VisitState2) {
    VisitState2["initialized"] = "initialized";
    VisitState2["started"] = "started";
    VisitState2["canceled"] = "canceled";
    VisitState2["failed"] = "failed";
    VisitState2["completed"] = "completed";
  })(VisitState || (VisitState = {}));
  var defaultOptions = {
    action: "advance",
    historyChanged: false,
    visitCachedSnapshot: () => {
    },
    willRender: true,
    updateHistory: true,
    shouldCacheSnapshot: true,
    acceptsStreamResponse: false
  };
  var SystemStatusCode;
  (function(SystemStatusCode2) {
    SystemStatusCode2[SystemStatusCode2["networkFailure"] = 0] = "networkFailure";
    SystemStatusCode2[SystemStatusCode2["timeoutFailure"] = -1] = "timeoutFailure";
    SystemStatusCode2[SystemStatusCode2["contentTypeMismatch"] = -2] = "contentTypeMismatch";
  })(SystemStatusCode || (SystemStatusCode = {}));
  var Visit = class {
    constructor(delegate, location2, restorationIdentifier, options = {}) {
      this.identifier = uuid();
      this.timingMetrics = {};
      this.followedRedirect = false;
      this.historyChanged = false;
      this.scrolled = false;
      this.shouldCacheSnapshot = true;
      this.acceptsStreamResponse = false;
      this.snapshotCached = false;
      this.state = VisitState.initialized;
      this.delegate = delegate;
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier || uuid();
      const { action, historyChanged, referrer, snapshot, snapshotHTML, response, visitCachedSnapshot, willRender, updateHistory, shouldCacheSnapshot, acceptsStreamResponse } = Object.assign(Object.assign({}, defaultOptions), options);
      this.action = action;
      this.historyChanged = historyChanged;
      this.referrer = referrer;
      this.snapshot = snapshot;
      this.snapshotHTML = snapshotHTML;
      this.response = response;
      this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action);
      this.visitCachedSnapshot = visitCachedSnapshot;
      this.willRender = willRender;
      this.updateHistory = updateHistory;
      this.scrolled = !willRender;
      this.shouldCacheSnapshot = shouldCacheSnapshot;
      this.acceptsStreamResponse = acceptsStreamResponse;
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    get restorationData() {
      return this.history.getRestorationDataForIdentifier(this.restorationIdentifier);
    }
    get silent() {
      return this.isSamePage;
    }
    start() {
      if (this.state == VisitState.initialized) {
        this.recordTimingMetric(TimingMetric.visitStart);
        this.state = VisitState.started;
        this.adapter.visitStarted(this);
        this.delegate.visitStarted(this);
      }
    }
    cancel() {
      if (this.state == VisitState.started) {
        if (this.request) {
          this.request.cancel();
        }
        this.cancelRender();
        this.state = VisitState.canceled;
      }
    }
    complete() {
      if (this.state == VisitState.started) {
        this.recordTimingMetric(TimingMetric.visitEnd);
        this.state = VisitState.completed;
        this.followRedirect();
        if (!this.followedRedirect) {
          this.adapter.visitCompleted(this);
          this.delegate.visitCompleted(this);
        }
      }
    }
    fail() {
      if (this.state == VisitState.started) {
        this.state = VisitState.failed;
        this.adapter.visitFailed(this);
      }
    }
    changeHistory() {
      var _a;
      if (!this.historyChanged && this.updateHistory) {
        const actionForHistory = this.location.href === ((_a = this.referrer) === null || _a === void 0 ? void 0 : _a.href) ? "replace" : this.action;
        const method = getHistoryMethodForAction(actionForHistory);
        this.history.update(method, this.location, this.restorationIdentifier);
        this.historyChanged = true;
      }
    }
    issueRequest() {
      if (this.hasPreloadedResponse()) {
        this.simulateRequest();
      } else if (this.shouldIssueRequest() && !this.request) {
        this.request = new FetchRequest(this, FetchMethod.get, this.location);
        this.request.perform();
      }
    }
    simulateRequest() {
      if (this.response) {
        this.startRequest();
        this.recordResponse();
        this.finishRequest();
      }
    }
    startRequest() {
      this.recordTimingMetric(TimingMetric.requestStart);
      this.adapter.visitRequestStarted(this);
    }
    recordResponse(response = this.response) {
      this.response = response;
      if (response) {
        const { statusCode } = response;
        if (isSuccessful(statusCode)) {
          this.adapter.visitRequestCompleted(this);
        } else {
          this.adapter.visitRequestFailedWithStatusCode(this, statusCode);
        }
      }
    }
    finishRequest() {
      this.recordTimingMetric(TimingMetric.requestEnd);
      this.adapter.visitRequestFinished(this);
    }
    loadResponse() {
      if (this.response) {
        const { statusCode, responseHTML } = this.response;
        this.render(async () => {
          if (this.shouldCacheSnapshot)
            this.cacheSnapshot();
          if (this.view.renderPromise)
            await this.view.renderPromise;
          if (isSuccessful(statusCode) && responseHTML != null) {
            await this.view.renderPage(PageSnapshot.fromHTMLString(responseHTML), false, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            this.complete();
          } else {
            await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this);
            this.adapter.visitRendered(this);
            this.fail();
          }
        });
      }
    }
    getCachedSnapshot() {
      const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot();
      if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
        if (this.action == "restore" || snapshot.isPreviewable) {
          return snapshot;
        }
      }
    }
    getPreloadedSnapshot() {
      if (this.snapshotHTML) {
        return PageSnapshot.fromHTMLString(this.snapshotHTML);
      }
    }
    hasCachedSnapshot() {
      return this.getCachedSnapshot() != null;
    }
    loadCachedSnapshot() {
      const snapshot = this.getCachedSnapshot();
      if (snapshot) {
        const isPreview = this.shouldIssueRequest();
        this.render(async () => {
          this.cacheSnapshot();
          if (this.isSamePage) {
            this.adapter.visitRendered(this);
          } else {
            if (this.view.renderPromise)
              await this.view.renderPromise;
            await this.view.renderPage(snapshot, isPreview, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            if (!isPreview) {
              this.complete();
            }
          }
        });
      }
    }
    followRedirect() {
      var _a;
      if (this.redirectedToLocation && !this.followedRedirect && ((_a = this.response) === null || _a === void 0 ? void 0 : _a.redirected)) {
        this.adapter.visitProposedToLocation(this.redirectedToLocation, {
          action: "replace",
          response: this.response,
          shouldCacheSnapshot: false,
          willRender: false
        });
        this.followedRedirect = true;
      }
    }
    goToSamePageAnchor() {
      if (this.isSamePage) {
        this.render(async () => {
          this.cacheSnapshot();
          this.performScroll();
          this.changeHistory();
          this.adapter.visitRendered(this);
        });
      }
    }
    prepareRequest(request) {
      if (this.acceptsStreamResponse) {
        request.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted() {
      this.startRequest();
    }
    requestPreventedHandlingResponse(_request, _response) {
    }
    async requestSucceededWithResponse(request, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.redirectedToLocation = response.redirected ? response.location : void 0;
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    async requestFailedWithResponse(request, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    requestErrored(_request, _error) {
      this.recordResponse({
        statusCode: SystemStatusCode.networkFailure,
        redirected: false
      });
    }
    requestFinished() {
      this.finishRequest();
    }
    performScroll() {
      if (!this.scrolled && !this.view.forceReloaded) {
        if (this.action == "restore") {
          this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop();
        } else {
          this.scrollToAnchor() || this.view.scrollToTop();
        }
        if (this.isSamePage) {
          this.delegate.visitScrolledToSamePageLocation(this.view.lastRenderedLocation, this.location);
        }
        this.scrolled = true;
      }
    }
    scrollToRestoredPosition() {
      const { scrollPosition } = this.restorationData;
      if (scrollPosition) {
        this.view.scrollToPosition(scrollPosition);
        return true;
      }
    }
    scrollToAnchor() {
      const anchor = getAnchor(this.location);
      if (anchor != null) {
        this.view.scrollToAnchor(anchor);
        return true;
      }
    }
    recordTimingMetric(metric) {
      this.timingMetrics[metric] = new Date().getTime();
    }
    getTimingMetrics() {
      return Object.assign({}, this.timingMetrics);
    }
    getHistoryMethodForAction(action) {
      switch (action) {
        case "replace":
          return history.replaceState;
        case "advance":
        case "restore":
          return history.pushState;
      }
    }
    hasPreloadedResponse() {
      return typeof this.response == "object";
    }
    shouldIssueRequest() {
      if (this.isSamePage) {
        return false;
      } else if (this.action == "restore") {
        return !this.hasCachedSnapshot();
      } else {
        return this.willRender;
      }
    }
    cacheSnapshot() {
      if (!this.snapshotCached) {
        this.view.cacheSnapshot(this.snapshot).then((snapshot) => snapshot && this.visitCachedSnapshot(snapshot));
        this.snapshotCached = true;
      }
    }
    async render(callback) {
      this.cancelRender();
      await new Promise((resolve) => {
        this.frame = requestAnimationFrame(() => resolve());
      });
      await callback();
      delete this.frame;
    }
    cancelRender() {
      if (this.frame) {
        cancelAnimationFrame(this.frame);
        delete this.frame;
      }
    }
  };
  function isSuccessful(statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }
  var BrowserAdapter = class {
    constructor(session2) {
      this.progressBar = new ProgressBar();
      this.showProgressBar = () => {
        this.progressBar.show();
      };
      this.session = session2;
    }
    visitProposedToLocation(location2, options) {
      this.navigator.startVisit(location2, (options === null || options === void 0 ? void 0 : options.restorationIdentifier) || uuid(), options);
    }
    visitStarted(visit2) {
      this.location = visit2.location;
      visit2.loadCachedSnapshot();
      visit2.issueRequest();
      visit2.goToSamePageAnchor();
    }
    visitRequestStarted(visit2) {
      this.progressBar.setValue(0);
      if (visit2.hasCachedSnapshot() || visit2.action != "restore") {
        this.showVisitProgressBarAfterDelay();
      } else {
        this.showProgressBar();
      }
    }
    visitRequestCompleted(visit2) {
      visit2.loadResponse();
    }
    visitRequestFailedWithStatusCode(visit2, statusCode) {
      switch (statusCode) {
        case SystemStatusCode.networkFailure:
        case SystemStatusCode.timeoutFailure:
        case SystemStatusCode.contentTypeMismatch:
          return this.reload({
            reason: "request_failed",
            context: {
              statusCode
            }
          });
        default:
          return visit2.loadResponse();
      }
    }
    visitRequestFinished(_visit) {
      this.progressBar.setValue(1);
      this.hideVisitProgressBar();
    }
    visitCompleted(_visit) {
    }
    pageInvalidated(reason) {
      this.reload(reason);
    }
    visitFailed(_visit) {
    }
    visitRendered(_visit) {
    }
    formSubmissionStarted(_formSubmission) {
      this.progressBar.setValue(0);
      this.showFormProgressBarAfterDelay();
    }
    formSubmissionFinished(_formSubmission) {
      this.progressBar.setValue(1);
      this.hideFormProgressBar();
    }
    showVisitProgressBarAfterDelay() {
      this.visitProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
    }
    hideVisitProgressBar() {
      this.progressBar.hide();
      if (this.visitProgressBarTimeout != null) {
        window.clearTimeout(this.visitProgressBarTimeout);
        delete this.visitProgressBarTimeout;
      }
    }
    showFormProgressBarAfterDelay() {
      if (this.formProgressBarTimeout == null) {
        this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
      }
    }
    hideFormProgressBar() {
      this.progressBar.hide();
      if (this.formProgressBarTimeout != null) {
        window.clearTimeout(this.formProgressBarTimeout);
        delete this.formProgressBarTimeout;
      }
    }
    reload(reason) {
      var _a;
      dispatch("turbo:reload", { detail: reason });
      window.location.href = ((_a = this.location) === null || _a === void 0 ? void 0 : _a.toString()) || window.location.href;
    }
    get navigator() {
      return this.session.navigator;
    }
  };
  var CacheObserver = class {
    constructor() {
      this.started = false;
      this.removeStaleElements = (_event) => {
        const staleElements = [...document.querySelectorAll('[data-turbo-cache="false"]')];
        for (const element of staleElements) {
          element.remove();
        }
      };
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
  };
  var FrameRedirector = class {
    constructor(session2, element) {
      this.session = session2;
      this.element = element;
      this.linkInterceptor = new LinkInterceptor(this, element);
      this.formSubmitObserver = new FormSubmitObserver(this, element);
    }
    start() {
      this.linkInterceptor.start();
      this.formSubmitObserver.start();
    }
    stop() {
      this.linkInterceptor.stop();
      this.formSubmitObserver.stop();
    }
    shouldInterceptLinkClick(element, _location, _event) {
      return this.shouldRedirect(element);
    }
    linkClickIntercepted(element, url, event) {
      const frame = this.findFrameElement(element);
      if (frame) {
        frame.delegate.linkClickIntercepted(element, url, event);
      }
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == null && this.shouldSubmit(element, submitter) && this.shouldRedirect(element, submitter);
    }
    formSubmitted(element, submitter) {
      const frame = this.findFrameElement(element, submitter);
      if (frame) {
        frame.delegate.formSubmitted(element, submitter);
      }
    }
    shouldSubmit(form, submitter) {
      var _a;
      const action = getAction(form, submitter);
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const rootLocation = expandURL((_a = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a !== void 0 ? _a : "/");
      return this.shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation);
    }
    shouldRedirect(element, submitter) {
      const isNavigatable = element instanceof HTMLFormElement ? this.session.submissionIsNavigatable(element, submitter) : this.session.elementIsNavigatable(element);
      if (isNavigatable) {
        const frame = this.findFrameElement(element, submitter);
        return frame ? frame != element.closest("turbo-frame") : false;
      } else {
        return false;
      }
    }
    findFrameElement(element, submitter) {
      const id = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("data-turbo-frame")) || element.getAttribute("data-turbo-frame");
      if (id && id != "_top") {
        const frame = this.element.querySelector(`#${id}:not([disabled])`);
        if (frame instanceof FrameElement) {
          return frame;
        }
      }
    }
  };
  var History = class {
    constructor(delegate) {
      this.restorationIdentifier = uuid();
      this.restorationData = {};
      this.started = false;
      this.pageLoaded = false;
      this.onPopState = (event) => {
        if (this.shouldHandlePopState()) {
          const { turbo } = event.state || {};
          if (turbo) {
            this.location = new URL(window.location.href);
            const { restorationIdentifier } = turbo;
            this.restorationIdentifier = restorationIdentifier;
            this.delegate.historyPoppedToLocationWithRestorationIdentifier(this.location, restorationIdentifier);
          }
        }
      };
      this.onPageLoad = async (_event) => {
        await nextMicrotask();
        this.pageLoaded = true;
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        addEventListener("popstate", this.onPopState, false);
        addEventListener("load", this.onPageLoad, false);
        this.started = true;
        this.replace(new URL(window.location.href));
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("popstate", this.onPopState, false);
        removeEventListener("load", this.onPageLoad, false);
        this.started = false;
      }
    }
    push(location2, restorationIdentifier) {
      this.update(history.pushState, location2, restorationIdentifier);
    }
    replace(location2, restorationIdentifier) {
      this.update(history.replaceState, location2, restorationIdentifier);
    }
    update(method, location2, restorationIdentifier = uuid()) {
      const state = { turbo: { restorationIdentifier } };
      method.call(history, state, "", location2.href);
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier;
    }
    getRestorationDataForIdentifier(restorationIdentifier) {
      return this.restorationData[restorationIdentifier] || {};
    }
    updateRestorationData(additionalData) {
      const { restorationIdentifier } = this;
      const restorationData = this.restorationData[restorationIdentifier];
      this.restorationData[restorationIdentifier] = Object.assign(Object.assign({}, restorationData), additionalData);
    }
    assumeControlOfScrollRestoration() {
      var _a;
      if (!this.previousScrollRestoration) {
        this.previousScrollRestoration = (_a = history.scrollRestoration) !== null && _a !== void 0 ? _a : "auto";
        history.scrollRestoration = "manual";
      }
    }
    relinquishControlOfScrollRestoration() {
      if (this.previousScrollRestoration) {
        history.scrollRestoration = this.previousScrollRestoration;
        delete this.previousScrollRestoration;
      }
    }
    shouldHandlePopState() {
      return this.pageIsLoaded();
    }
    pageIsLoaded() {
      return this.pageLoaded || document.readyState == "complete";
    }
  };
  var Navigator = class {
    constructor(delegate) {
      this.delegate = delegate;
    }
    proposeVisit(location2, options = {}) {
      if (this.delegate.allowsVisitingLocationWithAction(location2, options.action)) {
        if (locationIsVisitable(location2, this.view.snapshot.rootLocation)) {
          this.delegate.visitProposedToLocation(location2, options);
        } else {
          window.location.href = location2.toString();
        }
      }
    }
    startVisit(locatable, restorationIdentifier, options = {}) {
      this.stop();
      this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, Object.assign({ referrer: this.location }, options));
      this.currentVisit.start();
    }
    submitForm(form, submitter) {
      this.stop();
      this.formSubmission = new FormSubmission(this, form, submitter, true);
      this.formSubmission.start();
    }
    stop() {
      if (this.formSubmission) {
        this.formSubmission.stop();
        delete this.formSubmission;
      }
      if (this.currentVisit) {
        this.currentVisit.cancel();
        delete this.currentVisit;
      }
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    formSubmissionStarted(formSubmission) {
      if (typeof this.adapter.formSubmissionStarted === "function") {
        this.adapter.formSubmissionStarted(formSubmission);
      }
    }
    async formSubmissionSucceededWithResponse(formSubmission, fetchResponse) {
      if (formSubmission == this.formSubmission) {
        const responseHTML = await fetchResponse.responseHTML;
        if (responseHTML) {
          const shouldCacheSnapshot = formSubmission.method == FetchMethod.get;
          if (!shouldCacheSnapshot) {
            this.view.clearSnapshotCache();
          }
          const { statusCode, redirected } = fetchResponse;
          const action = this.getActionForFormSubmission(formSubmission);
          const visitOptions = {
            action,
            shouldCacheSnapshot,
            response: { statusCode, responseHTML, redirected }
          };
          this.proposeVisit(fetchResponse.location, visitOptions);
        }
      }
    }
    async formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      const responseHTML = await fetchResponse.responseHTML;
      if (responseHTML) {
        const snapshot = PageSnapshot.fromHTMLString(responseHTML);
        if (fetchResponse.serverError) {
          await this.view.renderError(snapshot, this.currentVisit);
        } else {
          await this.view.renderPage(snapshot, false, true, this.currentVisit);
        }
        this.view.scrollToTop();
        this.view.clearSnapshotCache();
      }
    }
    formSubmissionErrored(formSubmission, error2) {
      console.error(error2);
    }
    formSubmissionFinished(formSubmission) {
      if (typeof this.adapter.formSubmissionFinished === "function") {
        this.adapter.formSubmissionFinished(formSubmission);
      }
    }
    visitStarted(visit2) {
      this.delegate.visitStarted(visit2);
    }
    visitCompleted(visit2) {
      this.delegate.visitCompleted(visit2);
    }
    locationWithActionIsSamePage(location2, action) {
      const anchor = getAnchor(location2);
      const currentAnchor = getAnchor(this.view.lastRenderedLocation);
      const isRestorationToTop = action === "restore" && typeof anchor === "undefined";
      return action !== "replace" && getRequestURL(location2) === getRequestURL(this.view.lastRenderedLocation) && (isRestorationToTop || anchor != null && anchor !== currentAnchor);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.delegate.visitScrolledToSamePageLocation(oldURL, newURL);
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    getActionForFormSubmission({ submitter, formElement }) {
      return getVisitAction(submitter, formElement) || "advance";
    }
  };
  var PageStage;
  (function(PageStage2) {
    PageStage2[PageStage2["initial"] = 0] = "initial";
    PageStage2[PageStage2["loading"] = 1] = "loading";
    PageStage2[PageStage2["interactive"] = 2] = "interactive";
    PageStage2[PageStage2["complete"] = 3] = "complete";
  })(PageStage || (PageStage = {}));
  var PageObserver = class {
    constructor(delegate) {
      this.stage = PageStage.initial;
      this.started = false;
      this.interpretReadyState = () => {
        const { readyState } = this;
        if (readyState == "interactive") {
          this.pageIsInteractive();
        } else if (readyState == "complete") {
          this.pageIsComplete();
        }
      };
      this.pageWillUnload = () => {
        this.delegate.pageWillUnload();
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        if (this.stage == PageStage.initial) {
          this.stage = PageStage.loading;
        }
        document.addEventListener("readystatechange", this.interpretReadyState, false);
        addEventListener("pagehide", this.pageWillUnload, false);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        document.removeEventListener("readystatechange", this.interpretReadyState, false);
        removeEventListener("pagehide", this.pageWillUnload, false);
        this.started = false;
      }
    }
    pageIsInteractive() {
      if (this.stage == PageStage.loading) {
        this.stage = PageStage.interactive;
        this.delegate.pageBecameInteractive();
      }
    }
    pageIsComplete() {
      this.pageIsInteractive();
      if (this.stage == PageStage.interactive) {
        this.stage = PageStage.complete;
        this.delegate.pageLoaded();
      }
    }
    get readyState() {
      return document.readyState;
    }
  };
  var ScrollObserver = class {
    constructor(delegate) {
      this.started = false;
      this.onScroll = () => {
        this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset });
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        addEventListener("scroll", this.onScroll, false);
        this.onScroll();
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("scroll", this.onScroll, false);
        this.started = false;
      }
    }
    updatePosition(position) {
      this.delegate.scrollPositionChanged(position);
    }
  };
  var StreamMessageRenderer = class {
    render({ fragment }) {
      Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () => document.documentElement.appendChild(fragment));
    }
    enteringBardo(currentPermanentElement, newPermanentElement) {
      newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true));
    }
    leavingBardo() {
    }
  };
  function getPermanentElementMapForFragment(fragment) {
    const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement);
    const permanentElementMap = {};
    for (const permanentElementInDocument of permanentElementsInDocument) {
      const { id } = permanentElementInDocument;
      for (const streamElement of fragment.querySelectorAll("turbo-stream")) {
        const elementInStream = getPermanentElementById(streamElement.templateElement.content, id);
        if (elementInStream) {
          permanentElementMap[id] = [permanentElementInDocument, elementInStream];
        }
      }
    }
    return permanentElementMap;
  }
  var StreamObserver = class {
    constructor(delegate) {
      this.sources = /* @__PURE__ */ new Set();
      this.started = false;
      this.inspectFetchResponse = (event) => {
        const response = fetchResponseFromEvent(event);
        if (response && fetchResponseIsStream(response)) {
          event.preventDefault();
          this.receiveMessageResponse(response);
        }
      };
      this.receiveMessageEvent = (event) => {
        if (this.started && typeof event.data == "string") {
          this.receiveMessageHTML(event.data);
        }
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    connectStreamSource(source) {
      if (!this.streamSourceIsConnected(source)) {
        this.sources.add(source);
        source.addEventListener("message", this.receiveMessageEvent, false);
      }
    }
    disconnectStreamSource(source) {
      if (this.streamSourceIsConnected(source)) {
        this.sources.delete(source);
        source.removeEventListener("message", this.receiveMessageEvent, false);
      }
    }
    streamSourceIsConnected(source) {
      return this.sources.has(source);
    }
    async receiveMessageResponse(response) {
      const html = await response.responseHTML;
      if (html) {
        this.receiveMessageHTML(html);
      }
    }
    receiveMessageHTML(html) {
      this.delegate.receivedMessageFromStream(StreamMessage.wrap(html));
    }
  };
  function fetchResponseFromEvent(event) {
    var _a;
    const fetchResponse = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.fetchResponse;
    if (fetchResponse instanceof FetchResponse) {
      return fetchResponse;
    }
  }
  function fetchResponseIsStream(response) {
    var _a;
    const contentType = (_a = response.contentType) !== null && _a !== void 0 ? _a : "";
    return contentType.startsWith(StreamMessage.contentType);
  }
  var ErrorRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      const { documentElement, body } = document;
      documentElement.replaceChild(newElement, body);
    }
    async render() {
      this.replaceHeadAndBody();
      this.activateScriptElements();
    }
    replaceHeadAndBody() {
      const { documentElement, head } = document;
      documentElement.replaceChild(this.newHead, head);
      this.renderElement(this.currentElement, this.newElement);
    }
    activateScriptElements() {
      for (const replaceableElement of this.scriptElements) {
        const parentNode = replaceableElement.parentNode;
        if (parentNode) {
          const element = activateScriptElement(replaceableElement);
          parentNode.replaceChild(element, replaceableElement);
        }
      }
    }
    get newHead() {
      return this.newSnapshot.headSnapshot.element;
    }
    get scriptElements() {
      return document.documentElement.querySelectorAll("script");
    }
  };
  var PageRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      if (document.body && newElement instanceof HTMLBodyElement) {
        document.body.replaceWith(newElement);
      } else {
        document.documentElement.appendChild(newElement);
      }
    }
    get shouldRender() {
      return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical;
    }
    get reloadReason() {
      if (!this.newSnapshot.isVisitable) {
        return {
          reason: "turbo_visit_control_is_reload"
        };
      }
      if (!this.trackedElementsAreIdentical) {
        return {
          reason: "tracked_element_mismatch"
        };
      }
    }
    async prepareToRender() {
      await this.mergeHead();
    }
    async render() {
      if (this.willRender) {
        await this.replaceBody();
      }
    }
    finishRendering() {
      super.finishRendering();
      if (!this.isPreview) {
        this.focusFirstAutofocusableElement();
      }
    }
    get currentHeadSnapshot() {
      return this.currentSnapshot.headSnapshot;
    }
    get newHeadSnapshot() {
      return this.newSnapshot.headSnapshot;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    async mergeHead() {
      const mergedHeadElements = this.mergeProvisionalElements();
      const newStylesheetElements = this.copyNewHeadStylesheetElements();
      this.copyNewHeadScriptElements();
      await mergedHeadElements;
      await newStylesheetElements;
    }
    async replaceBody() {
      await this.preservingPermanentElements(async () => {
        this.activateNewBody();
        await this.assignNewBody();
      });
    }
    get trackedElementsAreIdentical() {
      return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature;
    }
    async copyNewHeadStylesheetElements() {
      const loadingElements = [];
      for (const element of this.newHeadStylesheetElements) {
        loadingElements.push(waitForLoad(element));
        document.head.appendChild(element);
      }
      await Promise.all(loadingElements);
    }
    copyNewHeadScriptElements() {
      for (const element of this.newHeadScriptElements) {
        document.head.appendChild(activateScriptElement(element));
      }
    }
    async mergeProvisionalElements() {
      const newHeadElements = [...this.newHeadProvisionalElements];
      for (const element of this.currentHeadProvisionalElements) {
        if (!this.isCurrentElementInElementList(element, newHeadElements)) {
          document.head.removeChild(element);
        }
      }
      for (const element of newHeadElements) {
        document.head.appendChild(element);
      }
    }
    isCurrentElementInElementList(element, elementList) {
      for (const [index, newElement] of elementList.entries()) {
        if (element.tagName == "TITLE") {
          if (newElement.tagName != "TITLE") {
            continue;
          }
          if (element.innerHTML == newElement.innerHTML) {
            elementList.splice(index, 1);
            return true;
          }
        }
        if (newElement.isEqualNode(element)) {
          elementList.splice(index, 1);
          return true;
        }
      }
      return false;
    }
    removeCurrentHeadProvisionalElements() {
      for (const element of this.currentHeadProvisionalElements) {
        document.head.removeChild(element);
      }
    }
    copyNewHeadProvisionalElements() {
      for (const element of this.newHeadProvisionalElements) {
        document.head.appendChild(element);
      }
    }
    activateNewBody() {
      document.adoptNode(this.newElement);
      this.activateNewBodyScriptElements();
    }
    activateNewBodyScriptElements() {
      for (const inertScriptElement of this.newBodyScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    async assignNewBody() {
      await this.renderElement(this.currentElement, this.newElement);
    }
    get newHeadStylesheetElements() {
      return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get newHeadScriptElements() {
      return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get currentHeadProvisionalElements() {
      return this.currentHeadSnapshot.provisionalElements;
    }
    get newHeadProvisionalElements() {
      return this.newHeadSnapshot.provisionalElements;
    }
    get newBodyScriptElements() {
      return this.newElement.querySelectorAll("script");
    }
  };
  var SnapshotCache = class {
    constructor(size) {
      this.keys = [];
      this.snapshots = {};
      this.size = size;
    }
    has(location2) {
      return toCacheKey(location2) in this.snapshots;
    }
    get(location2) {
      if (this.has(location2)) {
        const snapshot = this.read(location2);
        this.touch(location2);
        return snapshot;
      }
    }
    put(location2, snapshot) {
      this.write(location2, snapshot);
      this.touch(location2);
      return snapshot;
    }
    clear() {
      this.snapshots = {};
    }
    read(location2) {
      return this.snapshots[toCacheKey(location2)];
    }
    write(location2, snapshot) {
      this.snapshots[toCacheKey(location2)] = snapshot;
    }
    touch(location2) {
      const key = toCacheKey(location2);
      const index = this.keys.indexOf(key);
      if (index > -1)
        this.keys.splice(index, 1);
      this.keys.unshift(key);
      this.trim();
    }
    trim() {
      for (const key of this.keys.splice(this.size)) {
        delete this.snapshots[key];
      }
    }
  };
  var PageView = class extends View {
    constructor() {
      super(...arguments);
      this.snapshotCache = new SnapshotCache(10);
      this.lastRenderedLocation = new URL(location.href);
      this.forceReloaded = false;
    }
    renderPage(snapshot, isPreview = false, willRender = true, visit2) {
      const renderer = new PageRenderer(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender);
      if (!renderer.shouldRender) {
        this.forceReloaded = true;
      } else {
        visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      }
      return this.render(renderer);
    }
    renderError(snapshot, visit2) {
      visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      const renderer = new ErrorRenderer(this.snapshot, snapshot, ErrorRenderer.renderElement, false);
      return this.render(renderer);
    }
    clearSnapshotCache() {
      this.snapshotCache.clear();
    }
    async cacheSnapshot(snapshot = this.snapshot) {
      if (snapshot.isCacheable) {
        this.delegate.viewWillCacheSnapshot();
        const { lastRenderedLocation: location2 } = this;
        await nextEventLoopTick();
        const cachedSnapshot = snapshot.clone();
        this.snapshotCache.put(location2, cachedSnapshot);
        return cachedSnapshot;
      }
    }
    getCachedSnapshotForLocation(location2) {
      return this.snapshotCache.get(location2);
    }
    get snapshot() {
      return PageSnapshot.fromElement(this.element);
    }
  };
  var Preloader = class {
    constructor(delegate) {
      this.selector = "a[data-turbo-preload]";
      this.delegate = delegate;
    }
    get snapshotCache() {
      return this.delegate.navigator.view.snapshotCache;
    }
    start() {
      if (document.readyState === "loading") {
        return document.addEventListener("DOMContentLoaded", () => {
          this.preloadOnLoadLinksForView(document.body);
        });
      } else {
        this.preloadOnLoadLinksForView(document.body);
      }
    }
    preloadOnLoadLinksForView(element) {
      for (const link of element.querySelectorAll(this.selector)) {
        this.preloadURL(link);
      }
    }
    async preloadURL(link) {
      const location2 = new URL(link.href);
      if (this.snapshotCache.has(location2)) {
        return;
      }
      try {
        const response = await fetch(location2.toString(), { headers: { "VND.PREFETCH": "true", Accept: "text/html" } });
        const responseText = await response.text();
        const snapshot = PageSnapshot.fromHTMLString(responseText);
        this.snapshotCache.put(location2, snapshot);
      } catch (_) {
      }
    }
  };
  var Session = class {
    constructor() {
      this.navigator = new Navigator(this);
      this.history = new History(this);
      this.preloader = new Preloader(this);
      this.view = new PageView(this, document.documentElement);
      this.adapter = new BrowserAdapter(this);
      this.pageObserver = new PageObserver(this);
      this.cacheObserver = new CacheObserver();
      this.linkClickObserver = new LinkClickObserver(this, window);
      this.formSubmitObserver = new FormSubmitObserver(this, document);
      this.scrollObserver = new ScrollObserver(this);
      this.streamObserver = new StreamObserver(this);
      this.formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement);
      this.frameRedirector = new FrameRedirector(this, document.documentElement);
      this.streamMessageRenderer = new StreamMessageRenderer();
      this.drive = true;
      this.enabled = true;
      this.progressBarDelay = 500;
      this.started = false;
      this.formMode = "on";
    }
    start() {
      if (!this.started) {
        this.pageObserver.start();
        this.cacheObserver.start();
        this.formLinkClickObserver.start();
        this.linkClickObserver.start();
        this.formSubmitObserver.start();
        this.scrollObserver.start();
        this.streamObserver.start();
        this.frameRedirector.start();
        this.history.start();
        this.preloader.start();
        this.started = true;
        this.enabled = true;
      }
    }
    disable() {
      this.enabled = false;
    }
    stop() {
      if (this.started) {
        this.pageObserver.stop();
        this.cacheObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkClickObserver.stop();
        this.formSubmitObserver.stop();
        this.scrollObserver.stop();
        this.streamObserver.stop();
        this.frameRedirector.stop();
        this.history.stop();
        this.started = false;
      }
    }
    registerAdapter(adapter) {
      this.adapter = adapter;
    }
    visit(location2, options = {}) {
      const frameElement = options.frame ? document.getElementById(options.frame) : null;
      if (frameElement instanceof FrameElement) {
        frameElement.src = location2.toString();
        frameElement.loaded;
      } else {
        this.navigator.proposeVisit(expandURL(location2), options);
      }
    }
    connectStreamSource(source) {
      this.streamObserver.connectStreamSource(source);
    }
    disconnectStreamSource(source) {
      this.streamObserver.disconnectStreamSource(source);
    }
    renderStreamMessage(message) {
      this.streamMessageRenderer.render(StreamMessage.wrap(message));
    }
    clearCache() {
      this.view.clearSnapshotCache();
    }
    setProgressBarDelay(delay) {
      this.progressBarDelay = delay;
    }
    setFormMode(mode) {
      this.formMode = mode;
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    historyPoppedToLocationWithRestorationIdentifier(location2, restorationIdentifier) {
      if (this.enabled) {
        this.navigator.startVisit(location2, restorationIdentifier, {
          action: "restore",
          historyChanged: true
        });
      } else {
        this.adapter.pageInvalidated({
          reason: "turbo_disabled"
        });
      }
    }
    scrollPositionChanged(position) {
      this.history.updateRestorationData({ scrollPosition: position });
    }
    willSubmitFormLinkToLocation(link, location2) {
      return this.elementIsNavigatable(link) && locationIsVisitable(location2, this.snapshot.rootLocation);
    }
    submittedFormLinkToLocation() {
    }
    willFollowLinkToLocation(link, location2, event) {
      return this.elementIsNavigatable(link) && locationIsVisitable(location2, this.snapshot.rootLocation) && this.applicationAllowsFollowingLinkToLocation(link, location2, event);
    }
    followedLinkToLocation(link, location2) {
      const action = this.getActionForLink(link);
      const acceptsStreamResponse = link.hasAttribute("data-turbo-stream");
      this.visit(location2.href, { action, acceptsStreamResponse });
    }
    allowsVisitingLocationWithAction(location2, action) {
      return this.locationWithActionIsSamePage(location2, action) || this.applicationAllowsVisitingLocation(location2);
    }
    visitProposedToLocation(location2, options) {
      extendURLWithDeprecatedProperties(location2);
      this.adapter.visitProposedToLocation(location2, options);
    }
    visitStarted(visit2) {
      if (!visit2.acceptsStreamResponse) {
        markAsBusy(document.documentElement);
      }
      extendURLWithDeprecatedProperties(visit2.location);
      if (!visit2.silent) {
        this.notifyApplicationAfterVisitingLocation(visit2.location, visit2.action);
      }
    }
    visitCompleted(visit2) {
      clearBusyState(document.documentElement);
      this.notifyApplicationAfterPageLoad(visit2.getTimingMetrics());
    }
    locationWithActionIsSamePage(location2, action) {
      return this.navigator.locationWithActionIsSamePage(location2, action);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL);
    }
    willSubmitForm(form, submitter) {
      const action = getAction(form, submitter);
      return this.submissionIsNavigatable(form, submitter) && locationIsVisitable(expandURL(action), this.snapshot.rootLocation);
    }
    formSubmitted(form, submitter) {
      this.navigator.submitForm(form, submitter);
    }
    pageBecameInteractive() {
      this.view.lastRenderedLocation = this.location;
      this.notifyApplicationAfterPageLoad();
    }
    pageLoaded() {
      this.history.assumeControlOfScrollRestoration();
    }
    pageWillUnload() {
      this.history.relinquishControlOfScrollRestoration();
    }
    receivedMessageFromStream(message) {
      this.renderStreamMessage(message);
    }
    viewWillCacheSnapshot() {
      var _a;
      if (!((_a = this.navigator.currentVisit) === null || _a === void 0 ? void 0 : _a.silent)) {
        this.notifyApplicationBeforeCachingSnapshot();
      }
    }
    allowsImmediateRender({ element }, options) {
      const event = this.notifyApplicationBeforeRender(element, options);
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
      this.view.lastRenderedLocation = this.history.location;
      this.notifyApplicationAfterRender();
    }
    preloadOnLoadLinksForView(element) {
      this.preloader.preloadOnLoadLinksForView(element);
    }
    viewInvalidated(reason) {
      this.adapter.pageInvalidated(reason);
    }
    frameLoaded(frame) {
      this.notifyApplicationAfterFrameLoad(frame);
    }
    frameRendered(fetchResponse, frame) {
      this.notifyApplicationAfterFrameRender(fetchResponse, frame);
    }
    applicationAllowsFollowingLinkToLocation(link, location2, ev) {
      const event = this.notifyApplicationAfterClickingLinkToLocation(link, location2, ev);
      return !event.defaultPrevented;
    }
    applicationAllowsVisitingLocation(location2) {
      const event = this.notifyApplicationBeforeVisitingLocation(location2);
      return !event.defaultPrevented;
    }
    notifyApplicationAfterClickingLinkToLocation(link, location2, event) {
      return dispatch("turbo:click", {
        target: link,
        detail: { url: location2.href, originalEvent: event },
        cancelable: true
      });
    }
    notifyApplicationBeforeVisitingLocation(location2) {
      return dispatch("turbo:before-visit", {
        detail: { url: location2.href },
        cancelable: true
      });
    }
    notifyApplicationAfterVisitingLocation(location2, action) {
      return dispatch("turbo:visit", { detail: { url: location2.href, action } });
    }
    notifyApplicationBeforeCachingSnapshot() {
      return dispatch("turbo:before-cache");
    }
    notifyApplicationBeforeRender(newBody, options) {
      return dispatch("turbo:before-render", {
        detail: Object.assign({ newBody }, options),
        cancelable: true
      });
    }
    notifyApplicationAfterRender() {
      return dispatch("turbo:render");
    }
    notifyApplicationAfterPageLoad(timing = {}) {
      return dispatch("turbo:load", {
        detail: { url: this.location.href, timing }
      });
    }
    notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL) {
      dispatchEvent(new HashChangeEvent("hashchange", {
        oldURL: oldURL.toString(),
        newURL: newURL.toString()
      }));
    }
    notifyApplicationAfterFrameLoad(frame) {
      return dispatch("turbo:frame-load", { target: frame });
    }
    notifyApplicationAfterFrameRender(fetchResponse, frame) {
      return dispatch("turbo:frame-render", {
        detail: { fetchResponse },
        target: frame,
        cancelable: true
      });
    }
    submissionIsNavigatable(form, submitter) {
      if (this.formMode == "off") {
        return false;
      } else {
        const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true;
        if (this.formMode == "optin") {
          return submitterIsNavigatable && form.closest('[data-turbo="true"]') != null;
        } else {
          return submitterIsNavigatable && this.elementIsNavigatable(form);
        }
      }
    }
    elementIsNavigatable(element) {
      const container = findClosestRecursively(element, "[data-turbo]");
      const withinFrame = findClosestRecursively(element, "turbo-frame");
      if (this.drive || withinFrame) {
        if (container) {
          return container.getAttribute("data-turbo") != "false";
        } else {
          return true;
        }
      } else {
        if (container) {
          return container.getAttribute("data-turbo") == "true";
        } else {
          return false;
        }
      }
    }
    getActionForLink(link) {
      return getVisitAction(link) || "advance";
    }
    get snapshot() {
      return this.view.snapshot;
    }
  };
  function extendURLWithDeprecatedProperties(url) {
    Object.defineProperties(url, deprecatedLocationPropertyDescriptors);
  }
  var deprecatedLocationPropertyDescriptors = {
    absoluteURL: {
      get() {
        return this.toString();
      }
    }
  };
  var Cache = class {
    constructor(session2) {
      this.session = session2;
    }
    clear() {
      this.session.clearCache();
    }
    resetCacheControl() {
      this.setCacheControl("");
    }
    exemptPageFromCache() {
      this.setCacheControl("no-cache");
    }
    exemptPageFromPreview() {
      this.setCacheControl("no-preview");
    }
    setCacheControl(value) {
      setMetaContent("turbo-cache-control", value);
    }
  };
  var StreamActions = {
    after() {
      this.targetElements.forEach((e) => {
        var _a;
        return (_a = e.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this.templateContent, e.nextSibling);
      });
    },
    append() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.append(this.templateContent));
    },
    before() {
      this.targetElements.forEach((e) => {
        var _a;
        return (_a = e.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this.templateContent, e);
      });
    },
    prepend() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.prepend(this.templateContent));
    },
    remove() {
      this.targetElements.forEach((e) => e.remove());
    },
    replace() {
      this.targetElements.forEach((e) => e.replaceWith(this.templateContent));
    },
    update() {
      this.targetElements.forEach((targetElement) => {
        targetElement.innerHTML = "";
        targetElement.append(this.templateContent);
      });
    }
  };
  var session = new Session();
  var cache = new Cache(session);
  var { navigator: navigator$1 } = session;
  function start() {
    session.start();
  }
  function registerAdapter(adapter) {
    session.registerAdapter(adapter);
  }
  function visit(location2, options) {
    session.visit(location2, options);
  }
  function connectStreamSource(source) {
    session.connectStreamSource(source);
  }
  function disconnectStreamSource(source) {
    session.disconnectStreamSource(source);
  }
  function renderStreamMessage(message) {
    session.renderStreamMessage(message);
  }
  function clearCache() {
    console.warn("Please replace `Turbo.clearCache()` with `Turbo.cache.clear()`. The top-level function is deprecated and will be removed in a future version of Turbo.`");
    session.clearCache();
  }
  function setProgressBarDelay(delay) {
    session.setProgressBarDelay(delay);
  }
  function setConfirmMethod(confirmMethod) {
    FormSubmission.confirmMethod = confirmMethod;
  }
  function setFormMode(mode) {
    session.setFormMode(mode);
  }
  var Turbo = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    navigator: navigator$1,
    session,
    cache,
    PageRenderer,
    PageSnapshot,
    FrameRenderer,
    start,
    registerAdapter,
    visit,
    connectStreamSource,
    disconnectStreamSource,
    renderStreamMessage,
    clearCache,
    setProgressBarDelay,
    setConfirmMethod,
    setFormMode,
    StreamActions
  });
  var FrameController = class {
    constructor(element) {
      this.fetchResponseLoaded = (_fetchResponse) => {
      };
      this.currentFetchRequest = null;
      this.resolveVisitPromise = () => {
      };
      this.connected = false;
      this.hasBeenLoaded = false;
      this.ignoredAttributes = /* @__PURE__ */ new Set();
      this.action = null;
      this.visitCachedSnapshot = ({ element: element2 }) => {
        const frame = element2.querySelector("#" + this.element.id);
        if (frame && this.previousFrameElement) {
          frame.replaceChildren(...this.previousFrameElement.children);
        }
        delete this.previousFrameElement;
      };
      this.element = element;
      this.view = new FrameView(this, this.element);
      this.appearanceObserver = new AppearanceObserver(this, this.element);
      this.formLinkClickObserver = new FormLinkClickObserver(this, this.element);
      this.linkInterceptor = new LinkInterceptor(this, this.element);
      this.restorationIdentifier = uuid();
      this.formSubmitObserver = new FormSubmitObserver(this, this.element);
    }
    connect() {
      if (!this.connected) {
        this.connected = true;
        if (this.loadingStyle == FrameLoadingStyle.lazy) {
          this.appearanceObserver.start();
        } else {
          this.loadSourceURL();
        }
        this.formLinkClickObserver.start();
        this.linkInterceptor.start();
        this.formSubmitObserver.start();
      }
    }
    disconnect() {
      if (this.connected) {
        this.connected = false;
        this.appearanceObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkInterceptor.stop();
        this.formSubmitObserver.stop();
      }
    }
    disabledChanged() {
      if (this.loadingStyle == FrameLoadingStyle.eager) {
        this.loadSourceURL();
      }
    }
    sourceURLChanged() {
      if (this.isIgnoringChangesTo("src"))
        return;
      if (this.element.isConnected) {
        this.complete = false;
      }
      if (this.loadingStyle == FrameLoadingStyle.eager || this.hasBeenLoaded) {
        this.loadSourceURL();
      }
    }
    sourceURLReloaded() {
      const { src } = this.element;
      this.ignoringChangesToAttribute("complete", () => {
        this.element.removeAttribute("complete");
      });
      this.element.src = null;
      this.element.src = src;
      return this.element.loaded;
    }
    completeChanged() {
      if (this.isIgnoringChangesTo("complete"))
        return;
      this.loadSourceURL();
    }
    loadingStyleChanged() {
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start();
      } else {
        this.appearanceObserver.stop();
        this.loadSourceURL();
      }
    }
    async loadSourceURL() {
      if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
        this.element.loaded = this.visit(expandURL(this.sourceURL));
        this.appearanceObserver.stop();
        await this.element.loaded;
        this.hasBeenLoaded = true;
      }
    }
    async loadResponse(fetchResponse) {
      if (fetchResponse.redirected || fetchResponse.succeeded && fetchResponse.isHTML) {
        this.sourceURL = fetchResponse.response.url;
      }
      try {
        const html = await fetchResponse.responseHTML;
        if (html) {
          const { body } = parseHTMLDocument(html);
          const newFrameElement = await this.extractForeignFrameElement(body);
          if (newFrameElement) {
            const snapshot = new Snapshot(newFrameElement);
            const renderer = new FrameRenderer(this, this.view.snapshot, snapshot, FrameRenderer.renderElement, false, false);
            if (this.view.renderPromise)
              await this.view.renderPromise;
            this.changeHistory();
            await this.view.render(renderer);
            this.complete = true;
            session.frameRendered(fetchResponse, this.element);
            session.frameLoaded(this.element);
            this.fetchResponseLoaded(fetchResponse);
          } else if (this.willHandleFrameMissingFromResponse(fetchResponse)) {
            console.warn(`A matching frame for #${this.element.id} was missing from the response, transforming into full-page Visit.`);
            this.visitResponse(fetchResponse.response);
          }
        }
      } catch (error2) {
        console.error(error2);
        this.view.invalidate();
      } finally {
        this.fetchResponseLoaded = () => {
        };
      }
    }
    elementAppearedInViewport(element) {
      this.proposeVisitIfNavigatedWithAction(element, element);
      this.loadSourceURL();
    }
    willSubmitFormLinkToLocation(link) {
      return this.shouldInterceptNavigation(link);
    }
    submittedFormLinkToLocation(link, _location, form) {
      const frame = this.findFrameElement(link);
      if (frame)
        form.setAttribute("data-turbo-frame", frame.id);
    }
    shouldInterceptLinkClick(element, _location, _event) {
      return this.shouldInterceptNavigation(element);
    }
    linkClickIntercepted(element, location2) {
      this.navigateFrame(element, location2);
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(element, submitter);
    }
    formSubmitted(element, submitter) {
      if (this.formSubmission) {
        this.formSubmission.stop();
      }
      this.formSubmission = new FormSubmission(this, element, submitter);
      const { fetchRequest } = this.formSubmission;
      this.prepareRequest(fetchRequest);
      this.formSubmission.start();
    }
    prepareRequest(request) {
      var _a;
      request.headers["Turbo-Frame"] = this.id;
      if ((_a = this.currentNavigationElement) === null || _a === void 0 ? void 0 : _a.hasAttribute("data-turbo-stream")) {
        request.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      markAsBusy(this.element);
    }
    requestPreventedHandlingResponse(_request, _response) {
      this.resolveVisitPromise();
    }
    async requestSucceededWithResponse(request, response) {
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    async requestFailedWithResponse(request, response) {
      console.error(response);
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    requestErrored(request, error2) {
      console.error(error2);
      this.resolveVisitPromise();
    }
    requestFinished(_request) {
      clearBusyState(this.element);
    }
    formSubmissionStarted({ formElement }) {
      markAsBusy(formElement, this.findFrameElement(formElement));
    }
    formSubmissionSucceededWithResponse(formSubmission, response) {
      const frame = this.findFrameElement(formSubmission.formElement, formSubmission.submitter);
      frame.delegate.proposeVisitIfNavigatedWithAction(frame, formSubmission.formElement, formSubmission.submitter);
      frame.delegate.loadResponse(response);
    }
    formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      this.element.delegate.loadResponse(fetchResponse);
    }
    formSubmissionErrored(formSubmission, error2) {
      console.error(error2);
    }
    formSubmissionFinished({ formElement }) {
      clearBusyState(formElement, this.findFrameElement(formElement));
    }
    allowsImmediateRender({ element: newFrame }, options) {
      const event = dispatch("turbo:before-frame-render", {
        target: this.element,
        detail: Object.assign({ newFrame }, options),
        cancelable: true
      });
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
    }
    preloadOnLoadLinksForView(element) {
      session.preloadOnLoadLinksForView(element);
    }
    viewInvalidated() {
    }
    willRenderFrame(currentElement, _newElement) {
      this.previousFrameElement = currentElement.cloneNode(true);
    }
    async visit(url) {
      var _a;
      const request = new FetchRequest(this, FetchMethod.get, url, new URLSearchParams(), this.element);
      (_a = this.currentFetchRequest) === null || _a === void 0 ? void 0 : _a.cancel();
      this.currentFetchRequest = request;
      return new Promise((resolve) => {
        this.resolveVisitPromise = () => {
          this.resolveVisitPromise = () => {
          };
          this.currentFetchRequest = null;
          resolve();
        };
        request.perform();
      });
    }
    navigateFrame(element, url, submitter) {
      const frame = this.findFrameElement(element, submitter);
      frame.delegate.proposeVisitIfNavigatedWithAction(frame, element, submitter);
      this.withCurrentNavigationElement(element, () => {
        frame.src = url;
      });
    }
    proposeVisitIfNavigatedWithAction(frame, element, submitter) {
      this.action = getVisitAction(submitter, element, frame);
      if (this.action) {
        const pageSnapshot = PageSnapshot.fromElement(frame).clone();
        const { visitCachedSnapshot } = frame.delegate;
        frame.delegate.fetchResponseLoaded = (fetchResponse) => {
          if (frame.src) {
            const { statusCode, redirected } = fetchResponse;
            const responseHTML = frame.ownerDocument.documentElement.outerHTML;
            const response = { statusCode, redirected, responseHTML };
            const options = {
              response,
              visitCachedSnapshot,
              willRender: false,
              updateHistory: false,
              restorationIdentifier: this.restorationIdentifier,
              snapshot: pageSnapshot
            };
            if (this.action)
              options.action = this.action;
            session.visit(frame.src, options);
          }
        };
      }
    }
    changeHistory() {
      if (this.action) {
        const method = getHistoryMethodForAction(this.action);
        session.history.update(method, expandURL(this.element.src || ""), this.restorationIdentifier);
      }
    }
    willHandleFrameMissingFromResponse(fetchResponse) {
      this.element.setAttribute("complete", "");
      const response = fetchResponse.response;
      const visit2 = async (url, options = {}) => {
        if (url instanceof Response) {
          this.visitResponse(url);
        } else {
          session.visit(url, options);
        }
      };
      const event = dispatch("turbo:frame-missing", {
        target: this.element,
        detail: { response, visit: visit2 },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    async visitResponse(response) {
      const wrapped = new FetchResponse(response);
      const responseHTML = await wrapped.responseHTML;
      const { location: location2, redirected, statusCode } = wrapped;
      return session.visit(location2, { response: { redirected, statusCode, responseHTML } });
    }
    findFrameElement(element, submitter) {
      var _a;
      const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      return (_a = getFrameElementById(id)) !== null && _a !== void 0 ? _a : this.element;
    }
    async extractForeignFrameElement(container) {
      let element;
      const id = CSS.escape(this.id);
      try {
        element = activateElement(container.querySelector(`turbo-frame#${id}`), this.sourceURL);
        if (element) {
          return element;
        }
        element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`), this.sourceURL);
        if (element) {
          await element.loaded;
          return await this.extractForeignFrameElement(element);
        }
      } catch (error2) {
        console.error(error2);
        return new FrameElement();
      }
      return null;
    }
    formActionIsVisitable(form, submitter) {
      const action = getAction(form, submitter);
      return locationIsVisitable(expandURL(action), this.rootLocation);
    }
    shouldInterceptNavigation(element, submitter) {
      const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      if (element instanceof HTMLFormElement && !this.formActionIsVisitable(element, submitter)) {
        return false;
      }
      if (!this.enabled || id == "_top") {
        return false;
      }
      if (id) {
        const frameElement = getFrameElementById(id);
        if (frameElement) {
          return !frameElement.disabled;
        }
      }
      if (!session.elementIsNavigatable(element)) {
        return false;
      }
      if (submitter && !session.elementIsNavigatable(submitter)) {
        return false;
      }
      return true;
    }
    get id() {
      return this.element.id;
    }
    get enabled() {
      return !this.element.disabled;
    }
    get sourceURL() {
      if (this.element.src) {
        return this.element.src;
      }
    }
    set sourceURL(sourceURL) {
      this.ignoringChangesToAttribute("src", () => {
        this.element.src = sourceURL !== null && sourceURL !== void 0 ? sourceURL : null;
      });
    }
    get loadingStyle() {
      return this.element.loading;
    }
    get isLoading() {
      return this.formSubmission !== void 0 || this.resolveVisitPromise() !== void 0;
    }
    get complete() {
      return this.element.hasAttribute("complete");
    }
    set complete(value) {
      this.ignoringChangesToAttribute("complete", () => {
        if (value) {
          this.element.setAttribute("complete", "");
        } else {
          this.element.removeAttribute("complete");
        }
      });
    }
    get isActive() {
      return this.element.isActive && this.connected;
    }
    get rootLocation() {
      var _a;
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const root = (_a = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a !== void 0 ? _a : "/";
      return expandURL(root);
    }
    isIgnoringChangesTo(attributeName) {
      return this.ignoredAttributes.has(attributeName);
    }
    ignoringChangesToAttribute(attributeName, callback) {
      this.ignoredAttributes.add(attributeName);
      callback();
      this.ignoredAttributes.delete(attributeName);
    }
    withCurrentNavigationElement(element, callback) {
      this.currentNavigationElement = element;
      callback();
      delete this.currentNavigationElement;
    }
  };
  function getFrameElementById(id) {
    if (id != null) {
      const element = document.getElementById(id);
      if (element instanceof FrameElement) {
        return element;
      }
    }
  }
  function activateElement(element, currentURL) {
    if (element) {
      const src = element.getAttribute("src");
      if (src != null && currentURL != null && urlsAreEqual(src, currentURL)) {
        throw new Error(`Matching <turbo-frame id="${element.id}"> element has a source URL which references itself`);
      }
      if (element.ownerDocument !== document) {
        element = document.importNode(element, true);
      }
      if (element instanceof FrameElement) {
        element.connectedCallback();
        element.disconnectedCallback();
        return element;
      }
    }
  }
  var StreamElement = class extends HTMLElement {
    static async renderElement(newElement) {
      await newElement.performAction();
    }
    async connectedCallback() {
      try {
        await this.render();
      } catch (error2) {
        console.error(error2);
      } finally {
        this.disconnect();
      }
    }
    async render() {
      var _a;
      return (_a = this.renderPromise) !== null && _a !== void 0 ? _a : this.renderPromise = (async () => {
        const event = this.beforeRenderEvent;
        if (this.dispatchEvent(event)) {
          await nextAnimationFrame();
          await event.detail.render(this);
        }
      })();
    }
    disconnect() {
      try {
        this.remove();
      } catch (_a) {
      }
    }
    removeDuplicateTargetChildren() {
      this.duplicateChildren.forEach((c) => c.remove());
    }
    get duplicateChildren() {
      var _a;
      const existingChildren = this.targetElements.flatMap((e) => [...e.children]).filter((c) => !!c.id);
      const newChildrenIds = [...((_a = this.templateContent) === null || _a === void 0 ? void 0 : _a.children) || []].filter((c) => !!c.id).map((c) => c.id);
      return existingChildren.filter((c) => newChildrenIds.includes(c.id));
    }
    get performAction() {
      if (this.action) {
        const actionFunction = StreamActions[this.action];
        if (actionFunction) {
          return actionFunction;
        }
        this.raise("unknown action");
      }
      this.raise("action attribute is missing");
    }
    get targetElements() {
      if (this.target) {
        return this.targetElementsById;
      } else if (this.targets) {
        return this.targetElementsByQuery;
      } else {
        this.raise("target or targets attribute is missing");
      }
    }
    get templateContent() {
      return this.templateElement.content.cloneNode(true);
    }
    get templateElement() {
      if (this.firstElementChild === null) {
        const template = this.ownerDocument.createElement("template");
        this.appendChild(template);
        return template;
      } else if (this.firstElementChild instanceof HTMLTemplateElement) {
        return this.firstElementChild;
      }
      this.raise("first child element must be a <template> element");
    }
    get action() {
      return this.getAttribute("action");
    }
    get target() {
      return this.getAttribute("target");
    }
    get targets() {
      return this.getAttribute("targets");
    }
    raise(message) {
      throw new Error(`${this.description}: ${message}`);
    }
    get description() {
      var _a, _b;
      return (_b = ((_a = this.outerHTML.match(/<[^>]+>/)) !== null && _a !== void 0 ? _a : [])[0]) !== null && _b !== void 0 ? _b : "<turbo-stream>";
    }
    get beforeRenderEvent() {
      return new CustomEvent("turbo:before-stream-render", {
        bubbles: true,
        cancelable: true,
        detail: { newStream: this, render: StreamElement.renderElement }
      });
    }
    get targetElementsById() {
      var _a;
      const element = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.getElementById(this.target);
      if (element !== null) {
        return [element];
      } else {
        return [];
      }
    }
    get targetElementsByQuery() {
      var _a;
      const elements = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.querySelectorAll(this.targets);
      if (elements.length !== 0) {
        return Array.prototype.slice.call(elements);
      } else {
        return [];
      }
    }
  };
  var StreamSourceElement = class extends HTMLElement {
    constructor() {
      super(...arguments);
      this.streamSource = null;
    }
    connectedCallback() {
      this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src);
      connectStreamSource(this.streamSource);
    }
    disconnectedCallback() {
      if (this.streamSource) {
        disconnectStreamSource(this.streamSource);
      }
    }
    get src() {
      return this.getAttribute("src") || "";
    }
  };
  FrameElement.delegateConstructor = FrameController;
  if (customElements.get("turbo-frame") === void 0) {
    customElements.define("turbo-frame", FrameElement);
  }
  if (customElements.get("turbo-stream") === void 0) {
    customElements.define("turbo-stream", StreamElement);
  }
  if (customElements.get("turbo-stream-source") === void 0) {
    customElements.define("turbo-stream-source", StreamSourceElement);
  }
  (() => {
    let element = document.currentScript;
    if (!element)
      return;
    if (element.hasAttribute("data-turbo-suppress-warning"))
      return;
    element = element.parentElement;
    while (element) {
      if (element == document.body) {
        return console.warn(unindent`
        You are loading Turbo from a <script> element inside the <body> element. This is probably not what you meant to do!

        Load your application’s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.

        For more information, see: https://turbo.hotwired.dev/handbook/building#working-with-script-elements

        ——
        Suppress this warning by adding a "data-turbo-suppress-warning" attribute to: %s
      `, element.outerHTML);
      }
      element = element.parentElement;
    }
  })();
  window.Turbo = Turbo;
  start();

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable.js
  var consumer;
  async function getConsumer() {
    return consumer || setConsumer(createConsumer2().then(setConsumer));
  }
  function setConsumer(newConsumer) {
    return consumer = newConsumer;
  }
  async function createConsumer2() {
    const { createConsumer: createConsumer3 } = await Promise.resolve().then(() => (init_src(), src_exports));
    return createConsumer3();
  }
  async function subscribeTo(channel, mixin) {
    const { subscriptions } = await getConsumer();
    return subscriptions.create(channel, mixin);
  }

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/snakeize.js
  function walk(obj) {
    if (!obj || typeof obj !== "object")
      return obj;
    if (obj instanceof Date || obj instanceof RegExp)
      return obj;
    if (Array.isArray(obj))
      return obj.map(walk);
    return Object.keys(obj).reduce(function(acc, key) {
      var camel = key[0].toLowerCase() + key.slice(1).replace(/([A-Z]+)/g, function(m, x) {
        return "_" + x.toLowerCase();
      });
      acc[camel] = walk(obj[key]);
      return acc;
    }, {});
  }

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable_stream_source_element.js
  var TurboCableStreamSourceElement = class extends HTMLElement {
    async connectedCallback() {
      connectStreamSource(this);
      this.subscription = await subscribeTo(this.channel, { received: this.dispatchMessageEvent.bind(this) });
    }
    disconnectedCallback() {
      disconnectStreamSource(this);
      if (this.subscription)
        this.subscription.unsubscribe();
    }
    dispatchMessageEvent(data) {
      const event = new MessageEvent("message", { data });
      return this.dispatchEvent(event);
    }
    get channel() {
      const channel = this.getAttribute("channel");
      const signed_stream_name = this.getAttribute("signed-stream-name");
      return { channel, signed_stream_name, ...walk({ ...this.dataset }) };
    }
  };
  if (customElements.get("turbo-cable-stream-source") === void 0) {
    customElements.define("turbo-cable-stream-source", TurboCableStreamSourceElement);
  }

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/fetch_requests.js
  function encodeMethodIntoRequestBody(event) {
    if (event.target instanceof HTMLFormElement) {
      const { target: form, detail: { fetchOptions } } = event;
      form.addEventListener("turbo:submit-start", ({ detail: { formSubmission: { submitter } } }) => {
        const body = isBodyInit(fetchOptions.body) ? fetchOptions.body : new URLSearchParams();
        const method = determineFetchMethod(submitter, body, form);
        if (!/get/i.test(method)) {
          if (/post/i.test(method)) {
            body.delete("_method");
          } else {
            body.set("_method", method);
          }
          fetchOptions.method = "post";
        }
      }, { once: true });
    }
  }
  function determineFetchMethod(submitter, body, form) {
    const formMethod = determineFormMethod(submitter);
    const overrideMethod = body.get("_method");
    const method = form.getAttribute("method") || "get";
    if (typeof formMethod == "string") {
      return formMethod;
    } else if (typeof overrideMethod == "string") {
      return overrideMethod;
    } else {
      return method;
    }
  }
  function determineFormMethod(submitter) {
    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
      if (submitter.hasAttribute("formmethod")) {
        return submitter.formMethod;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  function isBodyInit(body) {
    return body instanceof FormData || body instanceof URLSearchParams;
  }

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/index.js
  addEventListener("turbo:before-fetch-request", encodeMethodIntoRequestBody);

  // app/javascript/lib/tabler.min.js
  !function(t) {
    "function" == typeof define && define.amd ? define(t) : t();
  }(function() {
    "use strict";
    var t, e, n = "function" == typeof Map ? /* @__PURE__ */ new Map() : (t = [], e = [], { has: function(e2) {
      return t.indexOf(e2) > -1;
    }, get: function(n2) {
      return e[t.indexOf(n2)];
    }, set: function(n2, i2) {
      -1 === t.indexOf(n2) && (t.push(n2), e.push(i2));
    }, delete: function(n2) {
      var i2 = t.indexOf(n2);
      i2 > -1 && (t.splice(i2, 1), e.splice(i2, 1));
    } }), i = function(t2) {
      return new Event(t2, { bubbles: true });
    };
    try {
      new Event("test");
    } catch (t2) {
      i = function(t3) {
        var e2 = document.createEvent("Event");
        return e2.initEvent(t3, true, false), e2;
      };
    }
    function s(t2) {
      var e2 = n.get(t2);
      e2 && e2.destroy();
    }
    function r(t2) {
      var e2 = n.get(t2);
      e2 && e2.update();
    }
    var o = null;
    "undefined" == typeof window || "function" != typeof window.getComputedStyle ? ((o = function(t2) {
      return t2;
    }).destroy = function(t2) {
      return t2;
    }, o.update = function(t2) {
      return t2;
    }) : ((o = function(t2, e2) {
      return t2 && Array.prototype.forEach.call(t2.length ? t2 : [t2], function(t3) {
        return function(t4) {
          if (t4 && t4.nodeName && "TEXTAREA" === t4.nodeName && !n.has(t4)) {
            var e3, s2 = null, r2 = null, o2 = null, a2 = function() {
              t4.clientWidth !== r2 && h2();
            }, u2 = function(e4) {
              window.removeEventListener("resize", a2, false), t4.removeEventListener("input", h2, false), t4.removeEventListener("keyup", h2, false), t4.removeEventListener("autosize:destroy", u2, false), t4.removeEventListener("autosize:update", h2, false), Object.keys(e4).forEach(function(n2) {
                t4.style[n2] = e4[n2];
              }), n.delete(t4);
            }.bind(t4, { height: t4.style.height, resize: t4.style.resize, overflowY: t4.style.overflowY, overflowX: t4.style.overflowX, wordWrap: t4.style.wordWrap });
            t4.addEventListener("autosize:destroy", u2, false), "onpropertychange" in t4 && "oninput" in t4 && t4.addEventListener("keyup", h2, false), window.addEventListener("resize", a2, false), t4.addEventListener("input", h2, false), t4.addEventListener("autosize:update", h2, false), t4.style.overflowX = "hidden", t4.style.wordWrap = "break-word", n.set(t4, { destroy: u2, update: h2 }), "vertical" === (e3 = window.getComputedStyle(t4, null)).resize ? t4.style.resize = "none" : "both" === e3.resize && (t4.style.resize = "horizontal"), s2 = "content-box" === e3.boxSizing ? -(parseFloat(e3.paddingTop) + parseFloat(e3.paddingBottom)) : parseFloat(e3.borderTopWidth) + parseFloat(e3.borderBottomWidth), isNaN(s2) && (s2 = 0), h2();
          }
          function l2(e4) {
            var n2 = t4.style.width;
            t4.style.width = "0px", t4.style.width = n2, t4.style.overflowY = e4;
          }
          function c2() {
            if (0 !== t4.scrollHeight) {
              var e4 = function(t5) {
                for (var e5 = []; t5 && t5.parentNode && t5.parentNode instanceof Element; )
                  t5.parentNode.scrollTop && e5.push({ node: t5.parentNode, scrollTop: t5.parentNode.scrollTop }), t5 = t5.parentNode;
                return e5;
              }(t4), n2 = document.documentElement && document.documentElement.scrollTop;
              t4.style.height = "", t4.style.height = t4.scrollHeight + s2 + "px", r2 = t4.clientWidth, e4.forEach(function(t5) {
                t5.node.scrollTop = t5.scrollTop;
              }), n2 && (document.documentElement.scrollTop = n2);
            }
          }
          function h2() {
            c2();
            var e4 = Math.round(parseFloat(t4.style.height)), n2 = window.getComputedStyle(t4, null), s3 = "content-box" === n2.boxSizing ? Math.round(parseFloat(n2.height)) : t4.offsetHeight;
            if (s3 < e4 ? "hidden" === n2.overflowY && (l2("scroll"), c2(), s3 = "content-box" === n2.boxSizing ? Math.round(parseFloat(window.getComputedStyle(t4, null).height)) : t4.offsetHeight) : "hidden" !== n2.overflowY && (l2("hidden"), c2(), s3 = "content-box" === n2.boxSizing ? Math.round(parseFloat(window.getComputedStyle(t4, null).height)) : t4.offsetHeight), o2 !== s3) {
              o2 = s3;
              var r3 = i("autosize:resized");
              try {
                t4.dispatchEvent(r3);
              } catch (t5) {
              }
            }
          }
        }(t3);
      }), t2;
    }).destroy = function(t2) {
      return t2 && Array.prototype.forEach.call(t2.length ? t2 : [t2], s), t2;
    }, o.update = function(t2) {
      return t2 && Array.prototype.forEach.call(t2.length ? t2 : [t2], r), t2;
    });
    var a = o, u = document.querySelectorAll('[data-bs-toggle="autosize"]');
    function l(t2) {
      return (l = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t3) {
        return typeof t3;
      } : function(t3) {
        return t3 && "function" == typeof Symbol && t3.constructor === Symbol && t3 !== Symbol.prototype ? "symbol" : typeof t3;
      })(t2);
    }
    function c(t2, e2) {
      if (!(t2 instanceof e2))
        throw new TypeError("Cannot call a class as a function");
    }
    function h(t2, e2) {
      for (var n2 = 0; n2 < e2.length; n2++) {
        var i2 = e2[n2];
        i2.enumerable = i2.enumerable || false, i2.configurable = true, "value" in i2 && (i2.writable = true), Object.defineProperty(t2, i2.key, i2);
      }
    }
    function d(t2, e2, n2) {
      return e2 && h(t2.prototype, e2), n2 && h(t2, n2), t2;
    }
    function f(t2, e2) {
      if ("function" != typeof e2 && null !== e2)
        throw new TypeError("Super expression must either be null or a function");
      t2.prototype = Object.create(e2 && e2.prototype, { constructor: { value: t2, writable: true, configurable: true } }), e2 && g(t2, e2);
    }
    function p(t2) {
      return (p = Object.setPrototypeOf ? Object.getPrototypeOf : function(t3) {
        return t3.__proto__ || Object.getPrototypeOf(t3);
      })(t2);
    }
    function g(t2, e2) {
      return (g = Object.setPrototypeOf || function(t3, e3) {
        return t3.__proto__ = e3, t3;
      })(t2, e2);
    }
    function m(t2, e2) {
      if (null == t2)
        return {};
      var n2, i2, s2 = function(t3, e3) {
        if (null == t3)
          return {};
        var n3, i3, s3 = {}, r3 = Object.keys(t3);
        for (i3 = 0; i3 < r3.length; i3++)
          n3 = r3[i3], e3.indexOf(n3) >= 0 || (s3[n3] = t3[n3]);
        return s3;
      }(t2, e2);
      if (Object.getOwnPropertySymbols) {
        var r2 = Object.getOwnPropertySymbols(t2);
        for (i2 = 0; i2 < r2.length; i2++)
          n2 = r2[i2], e2.indexOf(n2) >= 0 || Object.prototype.propertyIsEnumerable.call(t2, n2) && (s2[n2] = t2[n2]);
      }
      return s2;
    }
    function v(t2, e2) {
      if (e2 && ("object" == typeof e2 || "function" == typeof e2))
        return e2;
      if (void 0 !== e2)
        throw new TypeError("Derived constructors may only return object or undefined");
      return function(t3) {
        if (void 0 === t3)
          throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        return t3;
      }(t2);
    }
    function _(t2) {
      var e2 = function() {
        if ("undefined" == typeof Reflect || !Reflect.construct)
          return false;
        if (Reflect.construct.sham)
          return false;
        if ("function" == typeof Proxy)
          return true;
        try {
          return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
          })), true;
        } catch (t3) {
          return false;
        }
      }();
      return function() {
        var n2, i2 = p(t2);
        if (e2) {
          var s2 = p(this).constructor;
          n2 = Reflect.construct(i2, arguments, s2);
        } else
          n2 = i2.apply(this, arguments);
        return v(this, n2);
      };
    }
    function y(t2, e2) {
      for (; !Object.prototype.hasOwnProperty.call(t2, e2) && null !== (t2 = p(t2)); )
        ;
      return t2;
    }
    function b(t2, e2, n2) {
      return (b = "undefined" != typeof Reflect && Reflect.get ? Reflect.get : function(t3, e3, n3) {
        var i2 = y(t3, e3);
        if (i2) {
          var s2 = Object.getOwnPropertyDescriptor(i2, e3);
          return s2.get ? s2.get.call(n3) : s2.value;
        }
      })(t2, e2, n2 || t2);
    }
    function k(t2, e2, n2, i2) {
      return (k = "undefined" != typeof Reflect && Reflect.set ? Reflect.set : function(t3, e3, n3, i3) {
        var s2, r2 = y(t3, e3);
        if (r2) {
          if ((s2 = Object.getOwnPropertyDescriptor(r2, e3)).set)
            return s2.set.call(i3, n3), true;
          if (!s2.writable)
            return false;
        }
        if (s2 = Object.getOwnPropertyDescriptor(i3, e3)) {
          if (!s2.writable)
            return false;
          s2.value = n3, Object.defineProperty(i3, e3, s2);
        } else
          !function(t4, e4, n4) {
            e4 in t4 ? Object.defineProperty(t4, e4, { value: n4, enumerable: true, configurable: true, writable: true }) : t4[e4] = n4;
          }(i3, e3, n3);
        return true;
      })(t2, e2, n2, i2);
    }
    function E(t2, e2, n2, i2, s2) {
      if (!k(t2, e2, n2, i2 || t2) && s2)
        throw new Error("failed to set property");
      return n2;
    }
    function w(t2, e2) {
      return function(t3) {
        if (Array.isArray(t3))
          return t3;
      }(t2) || function(t3, e3) {
        var n2 = null == t3 ? null : "undefined" != typeof Symbol && t3[Symbol.iterator] || t3["@@iterator"];
        if (null == n2)
          return;
        var i2, s2, r2 = [], o2 = true, a2 = false;
        try {
          for (n2 = n2.call(t3); !(o2 = (i2 = n2.next()).done) && (r2.push(i2.value), !e3 || r2.length !== e3); o2 = true)
            ;
        } catch (t4) {
          a2 = true, s2 = t4;
        } finally {
          try {
            o2 || null == n2.return || n2.return();
          } finally {
            if (a2)
              throw s2;
          }
        }
        return r2;
      }(t2, e2) || function(t3, e3) {
        if (!t3)
          return;
        if ("string" == typeof t3)
          return A(t3, e3);
        var n2 = Object.prototype.toString.call(t3).slice(8, -1);
        "Object" === n2 && t3.constructor && (n2 = t3.constructor.name);
        if ("Map" === n2 || "Set" === n2)
          return Array.from(t3);
        if ("Arguments" === n2 || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n2))
          return A(t3, e3);
      }(t2, e2) || function() {
        throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }();
    }
    function A(t2, e2) {
      (null == e2 || e2 > t2.length) && (e2 = t2.length);
      for (var n2 = 0, i2 = new Array(e2); n2 < e2; n2++)
        i2[n2] = t2[n2];
      return i2;
    }
    function C(t2) {
      return "string" == typeof t2 || t2 instanceof String;
    }
    u.length && u.forEach(function(t2) {
      a(t2);
    });
    var S = { NONE: "NONE", LEFT: "LEFT", FORCE_LEFT: "FORCE_LEFT", RIGHT: "RIGHT", FORCE_RIGHT: "FORCE_RIGHT" };
    function T(t2) {
      return t2.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
    }
    var D = function() {
      function t2(e2, n2, i2, s2) {
        for (c(this, t2), this.value = e2, this.cursorPos = n2, this.oldValue = i2, this.oldSelection = s2; this.value.slice(0, this.startChangePos) !== this.oldValue.slice(0, this.startChangePos); )
          --this.oldSelection.start;
      }
      return d(t2, [{ key: "startChangePos", get: function() {
        return Math.min(this.cursorPos, this.oldSelection.start);
      } }, { key: "insertedCount", get: function() {
        return this.cursorPos - this.startChangePos;
      } }, { key: "inserted", get: function() {
        return this.value.substr(this.startChangePos, this.insertedCount);
      } }, { key: "removedCount", get: function() {
        return Math.max(this.oldSelection.end - this.startChangePos || this.oldValue.length - this.value.length, 0);
      } }, { key: "removed", get: function() {
        return this.oldValue.substr(this.startChangePos, this.removedCount);
      } }, { key: "head", get: function() {
        return this.value.substring(0, this.startChangePos);
      } }, { key: "tail", get: function() {
        return this.value.substring(this.startChangePos + this.insertedCount);
      } }, { key: "removeDirection", get: function() {
        return !this.removedCount || this.insertedCount ? S.NONE : this.oldSelection.end === this.cursorPos || this.oldSelection.start === this.cursorPos ? S.RIGHT : S.LEFT;
      } }]), t2;
    }(), O = function() {
      function t2(e2) {
        c(this, t2), Object.assign(this, { inserted: "", rawInserted: "", skip: false, tailShift: 0 }, e2);
      }
      return d(t2, [{ key: "aggregate", value: function(t3) {
        return this.rawInserted += t3.rawInserted, this.skip = this.skip || t3.skip, this.inserted += t3.inserted, this.tailShift += t3.tailShift, this;
      } }, { key: "offset", get: function() {
        return this.tailShift + this.inserted.length;
      } }]), t2;
    }(), F = function() {
      function t2() {
        var e2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "", n2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0, i2 = arguments.length > 2 ? arguments[2] : void 0;
        c(this, t2), this.value = e2, this.from = n2, this.stop = i2;
      }
      return d(t2, [{ key: "toString", value: function() {
        return this.value;
      } }, { key: "extend", value: function(t3) {
        this.value += String(t3);
      } }, { key: "appendTo", value: function(t3) {
        return t3.append(this.toString(), { tail: true }).aggregate(t3._appendPlaceholder());
      } }, { key: "state", get: function() {
        return { value: this.value, from: this.from, stop: this.stop };
      }, set: function(t3) {
        Object.assign(this, t3);
      } }, { key: "shiftBefore", value: function(t3) {
        if (this.from >= t3 || !this.value.length)
          return "";
        var e2 = this.value[0];
        return this.value = this.value.slice(1), e2;
      } }]), t2;
    }();
    function x(t2) {
      var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
      return new x.InputMask(t2, e2);
    }
    var B = function() {
      function t2(e2) {
        c(this, t2), this._value = "", this._update(Object.assign({}, t2.DEFAULTS, e2)), this.isInitialized = true;
      }
      return d(t2, [{ key: "updateOptions", value: function(t3) {
        Object.keys(t3).length && this.withValueRefresh(this._update.bind(this, t3));
      } }, { key: "_update", value: function(t3) {
        Object.assign(this, t3);
      } }, { key: "state", get: function() {
        return { _value: this.value };
      }, set: function(t3) {
        this._value = t3._value;
      } }, { key: "reset", value: function() {
        this._value = "";
      } }, { key: "value", get: function() {
        return this._value;
      }, set: function(t3) {
        this.resolve(t3);
      } }, { key: "resolve", value: function(t3) {
        return this.reset(), this.append(t3, { input: true }, ""), this.doCommit(), this.value;
      } }, { key: "unmaskedValue", get: function() {
        return this.value;
      }, set: function(t3) {
        this.reset(), this.append(t3, {}, ""), this.doCommit();
      } }, { key: "typedValue", get: function() {
        return this.doParse(this.value);
      }, set: function(t3) {
        this.value = this.doFormat(t3);
      } }, { key: "rawInputValue", get: function() {
        return this.extractInput(0, this.value.length, { raw: true });
      }, set: function(t3) {
        this.reset(), this.append(t3, { raw: true }, ""), this.doCommit();
      } }, { key: "isComplete", get: function() {
        return true;
      } }, { key: "nearestInputPos", value: function(t3, e2) {
        return t3;
      } }, { key: "extractInput", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length;
        return this.value.slice(t3, e2);
      } }, { key: "extractTail", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length;
        return new F(this.extractInput(t3, e2), t3);
      } }, { key: "appendTail", value: function(t3) {
        return C(t3) && (t3 = new F(String(t3))), t3.appendTo(this);
      } }, { key: "_appendCharRaw", value: function(t3) {
        return t3 ? (this._value += t3, new O({ inserted: t3, rawInserted: t3 })) : new O();
      } }, { key: "_appendChar", value: function(t3) {
        var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 ? arguments[2] : void 0, i2 = this.state, s2 = this._appendCharRaw(this.doPrepare(t3, e2), e2);
        if (s2.inserted) {
          var r2, o2 = false !== this.doValidate(e2);
          if (o2 && null != n2) {
            var a2 = this.state;
            this.overwrite && (r2 = n2.state, n2.shiftBefore(this.value.length));
            var u2 = this.appendTail(n2);
            (o2 = u2.rawInserted === n2.toString()) && u2.inserted && (this.state = a2);
          }
          o2 || (s2 = new O(), this.state = i2, n2 && r2 && (n2.state = r2));
        }
        return s2;
      } }, { key: "_appendPlaceholder", value: function() {
        return new O();
      } }, { key: "append", value: function(t3, e2, n2) {
        if (!C(t3))
          throw new Error("value should be string");
        var i2 = new O(), s2 = C(n2) ? new F(String(n2)) : n2;
        e2 && e2.tail && (e2._beforeTailState = this.state);
        for (var r2 = 0; r2 < t3.length; ++r2)
          i2.aggregate(this._appendChar(t3[r2], e2, s2));
        return null != s2 && (i2.tailShift += this.appendTail(s2).tailShift), i2;
      } }, { key: "remove", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length;
        return this._value = this.value.slice(0, t3) + this.value.slice(e2), new O();
      } }, { key: "withValueRefresh", value: function(t3) {
        if (this._refreshing || !this.isInitialized)
          return t3();
        this._refreshing = true;
        var e2 = this.rawInputValue, n2 = this.value, i2 = t3();
        return this.rawInputValue = e2, this.value && this.value !== n2 && 0 === n2.indexOf(this.value) && this.append(n2.slice(this.value.length), {}, ""), delete this._refreshing, i2;
      } }, { key: "runIsolated", value: function(t3) {
        if (this._isolated || !this.isInitialized)
          return t3(this);
        this._isolated = true;
        var e2 = this.state, n2 = t3(this);
        return this.state = e2, delete this._isolated, n2;
      } }, { key: "doPrepare", value: function(t3) {
        var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return this.prepare ? this.prepare(t3, this, e2) : t3;
      } }, { key: "doValidate", value: function(t3) {
        return (!this.validate || this.validate(this.value, this, t3)) && (!this.parent || this.parent.doValidate(t3));
      } }, { key: "doCommit", value: function() {
        this.commit && this.commit(this.value, this);
      } }, { key: "doFormat", value: function(t3) {
        return this.format ? this.format(t3, this) : t3;
      } }, { key: "doParse", value: function(t3) {
        return this.parse ? this.parse(t3, this) : t3;
      } }, { key: "splice", value: function(t3, e2, n2, i2) {
        var s2 = t3 + e2, r2 = this.extractTail(s2), o2 = this.nearestInputPos(t3, i2);
        return new O({ tailShift: o2 - t3 }).aggregate(this.remove(o2)).aggregate(this.append(n2, { input: true }, r2));
      } }]), t2;
    }();
    function I(t2) {
      if (null == t2)
        throw new Error("mask property should be defined");
      return t2 instanceof RegExp ? x.MaskedRegExp : C(t2) ? x.MaskedPattern : t2 instanceof Date || t2 === Date ? x.MaskedDate : t2 instanceof Number || "number" == typeof t2 || t2 === Number ? x.MaskedNumber : Array.isArray(t2) || t2 === Array ? x.MaskedDynamic : x.Masked && t2.prototype instanceof x.Masked ? t2 : t2 instanceof Function ? x.MaskedFunction : t2 instanceof x.Masked ? t2.constructor : (console.warn("Mask not found for mask", t2), x.Masked);
    }
    function L(t2) {
      if (x.Masked && t2 instanceof x.Masked)
        return t2;
      var e2 = (t2 = Object.assign({}, t2)).mask;
      if (x.Masked && e2 instanceof x.Masked)
        return e2;
      var n2 = I(e2);
      if (!n2)
        throw new Error("Masked class is not found for provided mask, appropriate module needs to be import manually before creating mask.");
      return new n2(t2);
    }
    B.DEFAULTS = { format: function(t2) {
      return t2;
    }, parse: function(t2) {
      return t2;
    } }, x.Masked = B, x.createMask = L;
    var P = ["mask"], M = { 0: /\d/, a: /[\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/, "*": /./ }, N = function() {
      function t2(e2) {
        c(this, t2);
        var n2 = e2.mask, i2 = m(e2, P);
        this.masked = L({ mask: n2 }), Object.assign(this, i2);
      }
      return d(t2, [{ key: "reset", value: function() {
        this._isFilled = false, this.masked.reset();
      } }, { key: "remove", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length;
        return 0 === t3 && e2 >= 1 ? (this._isFilled = false, this.masked.remove(t3, e2)) : new O();
      } }, { key: "value", get: function() {
        return this.masked.value || (this._isFilled && !this.isOptional ? this.placeholderChar : "");
      } }, { key: "unmaskedValue", get: function() {
        return this.masked.unmaskedValue;
      } }, { key: "isComplete", get: function() {
        return Boolean(this.masked.value) || this.isOptional;
      } }, { key: "_appendChar", value: function(t3) {
        var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        if (this._isFilled)
          return new O();
        var n2 = this.masked.state, i2 = this.masked._appendChar(t3, e2);
        return i2.inserted && false === this.doValidate(e2) && (i2.inserted = i2.rawInserted = "", this.masked.state = n2), i2.inserted || this.isOptional || this.lazy || e2.input || (i2.inserted = this.placeholderChar), i2.skip = !i2.inserted && !this.isOptional, this._isFilled = Boolean(i2.inserted), i2;
      } }, { key: "append", value: function() {
        var t3;
        return (t3 = this.masked).append.apply(t3, arguments);
      } }, { key: "_appendPlaceholder", value: function() {
        var t3 = new O();
        return this._isFilled || this.isOptional ? t3 : (this._isFilled = true, t3.inserted = this.placeholderChar, t3);
      } }, { key: "extractTail", value: function() {
        var t3;
        return (t3 = this.masked).extractTail.apply(t3, arguments);
      } }, { key: "appendTail", value: function() {
        var t3;
        return (t3 = this.masked).appendTail.apply(t3, arguments);
      } }, { key: "extractInput", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, n2 = arguments.length > 2 ? arguments[2] : void 0;
        return this.masked.extractInput(t3, e2, n2);
      } }, { key: "nearestInputPos", value: function(t3) {
        var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : S.NONE, n2 = this.value.length, i2 = Math.min(Math.max(t3, 0), n2);
        switch (e2) {
          case S.LEFT:
          case S.FORCE_LEFT:
            return this.isComplete ? i2 : 0;
          case S.RIGHT:
          case S.FORCE_RIGHT:
            return this.isComplete ? i2 : n2;
          case S.NONE:
          default:
            return i2;
        }
      } }, { key: "doValidate", value: function() {
        var t3, e2;
        return (t3 = this.masked).doValidate.apply(t3, arguments) && (!this.parent || (e2 = this.parent).doValidate.apply(e2, arguments));
      } }, { key: "doCommit", value: function() {
        this.masked.doCommit();
      } }, { key: "state", get: function() {
        return { masked: this.masked.state, _isFilled: this._isFilled };
      }, set: function(t3) {
        this.masked.state = t3.masked, this._isFilled = t3._isFilled;
      } }]), t2;
    }(), R = function() {
      function t2(e2) {
        c(this, t2), Object.assign(this, e2), this._value = "";
      }
      return d(t2, [{ key: "value", get: function() {
        return this._value;
      } }, { key: "unmaskedValue", get: function() {
        return this.isUnmasking ? this.value : "";
      } }, { key: "reset", value: function() {
        this._isRawInput = false, this._value = "";
      } }, { key: "remove", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this._value.length;
        return this._value = this._value.slice(0, t3) + this._value.slice(e2), this._value || (this._isRawInput = false), new O();
      } }, { key: "nearestInputPos", value: function(t3) {
        var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : S.NONE, n2 = this._value.length;
        switch (e2) {
          case S.LEFT:
          case S.FORCE_LEFT:
            return 0;
          case S.NONE:
          case S.RIGHT:
          case S.FORCE_RIGHT:
          default:
            return n2;
        }
      } }, { key: "extractInput", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this._value.length;
        return (arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}).raw && this._isRawInput && this._value.slice(t3, e2) || "";
      } }, { key: "isComplete", get: function() {
        return true;
      } }, { key: "_appendChar", value: function(t3) {
        var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = new O();
        if (this._value)
          return n2;
        var i2 = this.char === t3[0] && (this.isUnmasking || e2.input || e2.raw) && !e2.tail;
        return i2 && (n2.rawInserted = this.char), this._value = n2.inserted = this.char, this._isRawInput = i2 && (e2.raw || e2.input), n2;
      } }, { key: "_appendPlaceholder", value: function() {
        var t3 = new O();
        return this._value ? t3 : (this._value = t3.inserted = this.char, t3);
      } }, { key: "extractTail", value: function() {
        return arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, new F("");
      } }, { key: "appendTail", value: function(t3) {
        return C(t3) && (t3 = new F(String(t3))), t3.appendTo(this);
      } }, { key: "append", value: function(t3, e2, n2) {
        var i2 = this._appendChar(t3, e2);
        return null != n2 && (i2.tailShift += this.appendTail(n2).tailShift), i2;
      } }, { key: "doCommit", value: function() {
      } }, { key: "state", get: function() {
        return { _value: this._value, _isRawInput: this._isRawInput };
      }, set: function(t3) {
        Object.assign(this, t3);
      } }]), t2;
    }(), j = ["chunks"], V = function() {
      function t2() {
        var e2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [], n2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0;
        c(this, t2), this.chunks = e2, this.from = n2;
      }
      return d(t2, [{ key: "toString", value: function() {
        return this.chunks.map(String).join("");
      } }, { key: "extend", value: function(e2) {
        if (String(e2)) {
          C(e2) && (e2 = new F(String(e2)));
          var n2 = this.chunks[this.chunks.length - 1], i2 = n2 && (n2.stop === e2.stop || null == e2.stop) && e2.from === n2.from + n2.toString().length;
          if (e2 instanceof F)
            i2 ? n2.extend(e2.toString()) : this.chunks.push(e2);
          else if (e2 instanceof t2) {
            if (null == e2.stop)
              for (var s2; e2.chunks.length && null == e2.chunks[0].stop; )
                (s2 = e2.chunks.shift()).from += e2.from, this.extend(s2);
            e2.toString() && (e2.stop = e2.blockIndex, this.chunks.push(e2));
          }
        }
      } }, { key: "appendTo", value: function(e2) {
        if (!(e2 instanceof x.MaskedPattern))
          return new F(this.toString()).appendTo(e2);
        for (var n2 = new O(), i2 = 0; i2 < this.chunks.length && !n2.skip; ++i2) {
          var s2 = this.chunks[i2], r2 = e2._mapPosToBlock(e2.value.length), o2 = s2.stop, a2 = void 0;
          if (null != o2 && (!r2 || r2.index <= o2) && ((s2 instanceof t2 || e2._stops.indexOf(o2) >= 0) && n2.aggregate(e2._appendPlaceholder(o2)), a2 = s2 instanceof t2 && e2._blocks[o2]), a2) {
            var u2 = a2.appendTail(s2);
            u2.skip = false, n2.aggregate(u2), e2._value += u2.inserted;
            var l2 = s2.toString().slice(u2.rawInserted.length);
            l2 && n2.aggregate(e2.append(l2, { tail: true }));
          } else
            n2.aggregate(e2.append(s2.toString(), { tail: true }));
        }
        return n2;
      } }, { key: "state", get: function() {
        return { chunks: this.chunks.map(function(t3) {
          return t3.state;
        }), from: this.from, stop: this.stop, blockIndex: this.blockIndex };
      }, set: function(e2) {
        var n2 = e2.chunks, i2 = m(e2, j);
        Object.assign(this, i2), this.chunks = n2.map(function(e3) {
          var n3 = "chunks" in e3 ? new t2() : new F();
          return n3.state = e3, n3;
        });
      } }, { key: "shiftBefore", value: function(t3) {
        if (this.from >= t3 || !this.chunks.length)
          return "";
        for (var e2 = t3 - this.from, n2 = 0; n2 < this.chunks.length; ) {
          var i2 = this.chunks[n2], s2 = i2.shiftBefore(e2);
          if (i2.toString()) {
            if (!s2)
              break;
            ++n2;
          } else
            this.chunks.splice(n2, 1);
          if (s2)
            return s2;
        }
        return "";
      } }]), t2;
    }(), H = function(t2) {
      f(n2, B);
      var e2 = _(n2);
      function n2() {
        return c(this, n2), e2.apply(this, arguments);
      }
      return d(n2, [{ key: "_update", value: function(t3) {
        t3.mask && (t3.validate = function(e3) {
          return e3.search(t3.mask) >= 0;
        }), b(p(n2.prototype), "_update", this).call(this, t3);
      } }]), n2;
    }();
    x.MaskedRegExp = H;
    var $ = ["_blocks"], z = function(t2) {
      f(n2, B);
      var e2 = _(n2);
      function n2() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        return c(this, n2), t3.definitions = Object.assign({}, M, t3.definitions), e2.call(this, Object.assign({}, n2.DEFAULTS, t3));
      }
      return d(n2, [{ key: "_update", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        t3.definitions = Object.assign({}, this.definitions, t3.definitions), b(p(n2.prototype), "_update", this).call(this, t3), this._rebuildMask();
      } }, { key: "_rebuildMask", value: function() {
        var t3 = this, e3 = this.definitions;
        this._blocks = [], this._stops = [], this._maskedBlocks = {};
        var i2 = this.mask;
        if (i2 && e3)
          for (var s2 = false, r2 = false, o2 = 0; o2 < i2.length; ++o2) {
            if (this.blocks) {
              if ("continue" === function() {
                var e4 = i2.slice(o2), n3 = Object.keys(t3.blocks).filter(function(t4) {
                  return 0 === e4.indexOf(t4);
                });
                n3.sort(function(t4, e5) {
                  return e5.length - t4.length;
                });
                var s3 = n3[0];
                if (s3) {
                  var r3 = L(Object.assign({ parent: t3, lazy: t3.lazy, placeholderChar: t3.placeholderChar, overwrite: t3.overwrite }, t3.blocks[s3]));
                  return r3 && (t3._blocks.push(r3), t3._maskedBlocks[s3] || (t3._maskedBlocks[s3] = []), t3._maskedBlocks[s3].push(t3._blocks.length - 1)), o2 += s3.length - 1, "continue";
                }
              }())
                continue;
            }
            var a2 = i2[o2], u2 = a2 in e3;
            if (a2 !== n2.STOP_CHAR)
              if ("{" !== a2 && "}" !== a2)
                if ("[" !== a2 && "]" !== a2) {
                  if (a2 === n2.ESCAPE_CHAR) {
                    if (!(a2 = i2[++o2]))
                      break;
                    u2 = false;
                  }
                  var l2 = u2 ? new N({ parent: this, lazy: this.lazy, placeholderChar: this.placeholderChar, mask: e3[a2], isOptional: r2 }) : new R({ char: a2, isUnmasking: s2 });
                  this._blocks.push(l2);
                } else
                  r2 = !r2;
              else
                s2 = !s2;
            else
              this._stops.push(this._blocks.length);
          }
      } }, { key: "state", get: function() {
        return Object.assign({}, b(p(n2.prototype), "state", this), { _blocks: this._blocks.map(function(t3) {
          return t3.state;
        }) });
      }, set: function(t3) {
        var e3 = t3._blocks, i2 = m(t3, $);
        this._blocks.forEach(function(t4, n3) {
          return t4.state = e3[n3];
        }), E(p(n2.prototype), "state", i2, this, true);
      } }, { key: "reset", value: function() {
        b(p(n2.prototype), "reset", this).call(this), this._blocks.forEach(function(t3) {
          return t3.reset();
        });
      } }, { key: "isComplete", get: function() {
        return this._blocks.every(function(t3) {
          return t3.isComplete;
        });
      } }, { key: "doCommit", value: function() {
        this._blocks.forEach(function(t3) {
          return t3.doCommit();
        }), b(p(n2.prototype), "doCommit", this).call(this);
      } }, { key: "unmaskedValue", get: function() {
        return this._blocks.reduce(function(t3, e3) {
          return t3 + e3.unmaskedValue;
        }, "");
      }, set: function(t3) {
        E(p(n2.prototype), "unmaskedValue", t3, this, true);
      } }, { key: "value", get: function() {
        return this._blocks.reduce(function(t3, e3) {
          return t3 + e3.value;
        }, "");
      }, set: function(t3) {
        E(p(n2.prototype), "value", t3, this, true);
      } }, { key: "appendTail", value: function(t3) {
        return b(p(n2.prototype), "appendTail", this).call(this, t3).aggregate(this._appendPlaceholder());
      } }, { key: "_appendCharRaw", value: function(t3) {
        var e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n3 = this._mapPosToBlock(this.value.length), i2 = new O();
        if (!n3)
          return i2;
        for (var s2 = n3.index; ; ++s2) {
          var r2 = this._blocks[s2];
          if (!r2)
            break;
          var o2 = r2._appendChar(t3, e3), a2 = o2.skip;
          if (i2.aggregate(o2), a2 || o2.rawInserted)
            break;
        }
        return i2;
      } }, { key: "extractTail", value: function() {
        var t3 = this, e3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, n3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, i2 = new V();
        return e3 === n3 ? i2 : (this._forEachBlocksInRange(e3, n3, function(e4, n4, s2, r2) {
          var o2 = e4.extractTail(s2, r2);
          o2.stop = t3._findStopBefore(n4), o2.from = t3._blockStartPos(n4), o2 instanceof V && (o2.blockIndex = n4), i2.extend(o2);
        }), i2);
      } }, { key: "extractInput", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        if (t3 === e3)
          return "";
        var i2 = "";
        return this._forEachBlocksInRange(t3, e3, function(t4, e4, s2, r2) {
          i2 += t4.extractInput(s2, r2, n3);
        }), i2;
      } }, { key: "_findStopBefore", value: function(t3) {
        for (var e3, n3 = 0; n3 < this._stops.length; ++n3) {
          var i2 = this._stops[n3];
          if (!(i2 <= t3))
            break;
          e3 = i2;
        }
        return e3;
      } }, { key: "_appendPlaceholder", value: function(t3) {
        var e3 = this, n3 = new O();
        if (this.lazy && null == t3)
          return n3;
        var i2 = this._mapPosToBlock(this.value.length);
        if (!i2)
          return n3;
        var s2 = i2.index, r2 = null != t3 ? t3 : this._blocks.length;
        return this._blocks.slice(s2, r2).forEach(function(i3) {
          if (!i3.lazy || null != t3) {
            var s3 = null != i3._blocks ? [i3._blocks.length] : [], r3 = i3._appendPlaceholder.apply(i3, s3);
            e3._value += r3.inserted, n3.aggregate(r3);
          }
        }), n3;
      } }, { key: "_mapPosToBlock", value: function(t3) {
        for (var e3 = "", n3 = 0; n3 < this._blocks.length; ++n3) {
          var i2 = this._blocks[n3], s2 = e3.length;
          if (t3 <= (e3 += i2.value).length)
            return { index: n3, offset: t3 - s2 };
        }
      } }, { key: "_blockStartPos", value: function(t3) {
        return this._blocks.slice(0, t3).reduce(function(t4, e3) {
          return t4 + e3.value.length;
        }, 0);
      } }, { key: "_forEachBlocksInRange", value: function(t3) {
        var e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, n3 = arguments.length > 2 ? arguments[2] : void 0, i2 = this._mapPosToBlock(t3);
        if (i2) {
          var s2 = this._mapPosToBlock(e3), r2 = s2 && i2.index === s2.index, o2 = i2.offset, a2 = s2 && r2 ? s2.offset : this._blocks[i2.index].value.length;
          if (n3(this._blocks[i2.index], i2.index, o2, a2), s2 && !r2) {
            for (var u2 = i2.index + 1; u2 < s2.index; ++u2)
              n3(this._blocks[u2], u2, 0, this._blocks[u2].value.length);
            n3(this._blocks[s2.index], s2.index, 0, s2.offset);
          }
        }
      } }, { key: "remove", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, i2 = b(p(n2.prototype), "remove", this).call(this, t3, e3);
        return this._forEachBlocksInRange(t3, e3, function(t4, e4, n3, s2) {
          i2.aggregate(t4.remove(n3, s2));
        }), i2;
      } }, { key: "nearestInputPos", value: function(t3) {
        var e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : S.NONE, n3 = this._mapPosToBlock(t3) || { index: 0, offset: 0 }, i2 = n3.offset, s2 = n3.index, r2 = this._blocks[s2];
        if (!r2)
          return t3;
        var o2 = i2;
        0 !== o2 && o2 < r2.value.length && (o2 = r2.nearestInputPos(i2, function(t4) {
          switch (t4) {
            case S.LEFT:
              return S.FORCE_LEFT;
            case S.RIGHT:
              return S.FORCE_RIGHT;
            default:
              return t4;
          }
        }(e3)));
        var a2 = o2 === r2.value.length;
        if (!(0 === o2) && !a2)
          return this._blockStartPos(s2) + o2;
        var u2 = a2 ? s2 + 1 : s2;
        if (e3 === S.NONE) {
          if (u2 > 0) {
            var l2 = u2 - 1, c2 = this._blocks[l2], h2 = c2.nearestInputPos(0, S.NONE);
            if (!c2.value.length || h2 !== c2.value.length)
              return this._blockStartPos(u2);
          }
          for (var d2 = u2; d2 < this._blocks.length; ++d2) {
            var f2 = this._blocks[d2], p2 = f2.nearestInputPos(0, S.NONE);
            if (!f2.value.length || p2 !== f2.value.length)
              return this._blockStartPos(d2) + p2;
          }
          for (var g2 = u2 - 1; g2 >= 0; --g2) {
            var m2 = this._blocks[g2], v2 = m2.nearestInputPos(0, S.NONE);
            if (!m2.value.length || v2 !== m2.value.length)
              return this._blockStartPos(g2) + m2.value.length;
          }
          return t3;
        }
        if (e3 === S.LEFT || e3 === S.FORCE_LEFT) {
          for (var _2, y2 = u2; y2 < this._blocks.length; ++y2)
            if (this._blocks[y2].value) {
              _2 = y2;
              break;
            }
          if (null != _2) {
            var b2 = this._blocks[_2], k2 = b2.nearestInputPos(0, S.RIGHT);
            if (0 === k2 && b2.unmaskedValue.length)
              return this._blockStartPos(_2) + k2;
          }
          for (var E2, w2 = -1, A2 = u2 - 1; A2 >= 0; --A2) {
            var C2 = this._blocks[A2], T2 = C2.nearestInputPos(C2.value.length, S.FORCE_LEFT);
            if (C2.value && 0 === T2 || (E2 = A2), 0 !== T2) {
              if (T2 !== C2.value.length)
                return this._blockStartPos(A2) + T2;
              w2 = A2;
              break;
            }
          }
          if (e3 === S.LEFT)
            for (var D2 = w2 + 1; D2 <= Math.min(u2, this._blocks.length - 1); ++D2) {
              var O2 = this._blocks[D2], F2 = O2.nearestInputPos(0, S.NONE), x2 = this._blockStartPos(D2) + F2;
              if (x2 > t3)
                break;
              if (F2 !== O2.value.length)
                return x2;
            }
          if (w2 >= 0)
            return this._blockStartPos(w2) + this._blocks[w2].value.length;
          if (e3 === S.FORCE_LEFT || this.lazy && !this.extractInput() && !function(t4) {
            if (!t4)
              return false;
            var e4 = t4.value;
            return !e4 || t4.nearestInputPos(0, S.NONE) !== e4.length;
          }(this._blocks[u2]))
            return 0;
          if (null != E2)
            return this._blockStartPos(E2);
          for (var B2 = u2; B2 < this._blocks.length; ++B2) {
            var I2 = this._blocks[B2], L2 = I2.nearestInputPos(0, S.NONE);
            if (!I2.value.length || L2 !== I2.value.length)
              return this._blockStartPos(B2) + L2;
          }
          return 0;
        }
        if (e3 === S.RIGHT || e3 === S.FORCE_RIGHT) {
          for (var P2, M2, N2 = u2; N2 < this._blocks.length; ++N2) {
            var R2 = this._blocks[N2], j2 = R2.nearestInputPos(0, S.NONE);
            if (j2 !== R2.value.length) {
              M2 = this._blockStartPos(N2) + j2, P2 = N2;
              break;
            }
          }
          if (null != P2 && null != M2) {
            for (var V2 = P2; V2 < this._blocks.length; ++V2) {
              var H2 = this._blocks[V2], $2 = H2.nearestInputPos(0, S.FORCE_RIGHT);
              if ($2 !== H2.value.length)
                return this._blockStartPos(V2) + $2;
            }
            return e3 === S.FORCE_RIGHT ? this.value.length : M2;
          }
          for (var z2 = Math.min(u2, this._blocks.length - 1); z2 >= 0; --z2) {
            var W2 = this._blocks[z2], U2 = W2.nearestInputPos(W2.value.length, S.LEFT);
            if (0 !== U2) {
              var q2 = this._blockStartPos(z2) + U2;
              if (q2 >= t3)
                return q2;
              break;
            }
          }
        }
        return t3;
      } }, { key: "maskedBlock", value: function(t3) {
        return this.maskedBlocks(t3)[0];
      } }, { key: "maskedBlocks", value: function(t3) {
        var e3 = this, n3 = this._maskedBlocks[t3];
        return n3 ? n3.map(function(t4) {
          return e3._blocks[t4];
        }) : [];
      } }]), n2;
    }();
    z.DEFAULTS = { lazy: true, placeholderChar: "_" }, z.STOP_CHAR = "`", z.ESCAPE_CHAR = "\\", z.InputDefinition = N, z.FixedDefinition = R, x.MaskedPattern = z;
    var W = function(t2) {
      f(n2, z);
      var e2 = _(n2);
      function n2() {
        return c(this, n2), e2.apply(this, arguments);
      }
      return d(n2, [{ key: "_matchFrom", get: function() {
        return this.maxLength - String(this.from).length;
      } }, { key: "_update", value: function(t3) {
        t3 = Object.assign({ to: this.to || 0, from: this.from || 0 }, t3);
        var e3 = String(t3.to).length;
        null != t3.maxLength && (e3 = Math.max(e3, t3.maxLength)), t3.maxLength = e3;
        for (var i2 = String(t3.from).padStart(e3, "0"), s2 = String(t3.to).padStart(e3, "0"), r2 = 0; r2 < s2.length && s2[r2] === i2[r2]; )
          ++r2;
        t3.mask = s2.slice(0, r2).replace(/0/g, "\\0") + "0".repeat(e3 - r2), b(p(n2.prototype), "_update", this).call(this, t3);
      } }, { key: "isComplete", get: function() {
        return b(p(n2.prototype), "isComplete", this) && Boolean(this.value);
      } }, { key: "boundaries", value: function(t3) {
        var e3 = "", n3 = "", i2 = w(t3.match(/^(\D*)(\d*)(\D*)/) || [], 3), s2 = i2[1], r2 = i2[2];
        return r2 && (e3 = "0".repeat(s2.length) + r2, n3 = "9".repeat(s2.length) + r2), [e3 = e3.padEnd(this.maxLength, "0"), n3 = n3.padEnd(this.maxLength, "9")];
      } }, { key: "doPrepare", value: function(t3) {
        var e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        if (t3 = b(p(n2.prototype), "doPrepare", this).call(this, t3, e3).replace(/\D/g, ""), !this.autofix)
          return t3;
        for (var i2 = String(this.from).padStart(this.maxLength, "0"), s2 = String(this.to).padStart(this.maxLength, "0"), r2 = this.value, o2 = "", a2 = 0; a2 < t3.length; ++a2) {
          var u2 = r2 + o2 + t3[a2], l2 = w(this.boundaries(u2), 2), c2 = l2[0], h2 = l2[1];
          Number(h2) < this.from ? o2 += i2[u2.length - 1] : Number(c2) > this.to ? o2 += s2[u2.length - 1] : o2 += t3[a2];
        }
        return o2;
      } }, { key: "doValidate", value: function() {
        var t3, e3 = this.value;
        if (-1 === e3.search(/[^0]/) && e3.length <= this._matchFrom)
          return true;
        for (var i2 = w(this.boundaries(e3), 2), s2 = i2[0], r2 = i2[1], o2 = arguments.length, a2 = new Array(o2), u2 = 0; u2 < o2; u2++)
          a2[u2] = arguments[u2];
        return this.from <= Number(r2) && Number(s2) <= this.to && (t3 = b(p(n2.prototype), "doValidate", this)).call.apply(t3, [this].concat(a2));
      } }]), n2;
    }();
    x.MaskedRange = W;
    var U = function(t2) {
      f(n2, z);
      var e2 = _(n2);
      function n2(t3) {
        return c(this, n2), e2.call(this, Object.assign({}, n2.DEFAULTS, t3));
      }
      return d(n2, [{ key: "_update", value: function(t3) {
        t3.mask === Date && delete t3.mask, t3.pattern && (t3.mask = t3.pattern);
        var e3 = t3.blocks;
        t3.blocks = Object.assign({}, n2.GET_DEFAULT_BLOCKS()), t3.min && (t3.blocks.Y.from = t3.min.getFullYear()), t3.max && (t3.blocks.Y.to = t3.max.getFullYear()), t3.min && t3.max && t3.blocks.Y.from === t3.blocks.Y.to && (t3.blocks.m.from = t3.min.getMonth() + 1, t3.blocks.m.to = t3.max.getMonth() + 1, t3.blocks.m.from === t3.blocks.m.to && (t3.blocks.d.from = t3.min.getDate(), t3.blocks.d.to = t3.max.getDate())), Object.assign(t3.blocks, e3), Object.keys(t3.blocks).forEach(function(e4) {
          var n3 = t3.blocks[e4];
          "autofix" in n3 || (n3.autofix = t3.autofix);
        }), b(p(n2.prototype), "_update", this).call(this, t3);
      } }, { key: "doValidate", value: function() {
        for (var t3, e3 = this.date, i2 = arguments.length, s2 = new Array(i2), r2 = 0; r2 < i2; r2++)
          s2[r2] = arguments[r2];
        return (t3 = b(p(n2.prototype), "doValidate", this)).call.apply(t3, [this].concat(s2)) && (!this.isComplete || this.isDateExist(this.value) && null != e3 && (null == this.min || this.min <= e3) && (null == this.max || e3 <= this.max));
      } }, { key: "isDateExist", value: function(t3) {
        return this.format(this.parse(t3, this), this).indexOf(t3) >= 0;
      } }, { key: "date", get: function() {
        return this.typedValue;
      }, set: function(t3) {
        this.typedValue = t3;
      } }, { key: "typedValue", get: function() {
        return this.isComplete ? b(p(n2.prototype), "typedValue", this) : null;
      }, set: function(t3) {
        E(p(n2.prototype), "typedValue", t3, this, true);
      } }]), n2;
    }();
    U.DEFAULTS = { pattern: "d{.}`m{.}`Y", format: function(t2) {
      return [String(t2.getDate()).padStart(2, "0"), String(t2.getMonth() + 1).padStart(2, "0"), t2.getFullYear()].join(".");
    }, parse: function(t2) {
      var e2 = w(t2.split("."), 3), n2 = e2[0], i2 = e2[1], s2 = e2[2];
      return new Date(s2, i2 - 1, n2);
    } }, U.GET_DEFAULT_BLOCKS = function() {
      return { d: { mask: W, from: 1, to: 31, maxLength: 2 }, m: { mask: W, from: 1, to: 12, maxLength: 2 }, Y: { mask: W, from: 1900, to: 9999 } };
    }, x.MaskedDate = U;
    var q = function() {
      function t2() {
        c(this, t2);
      }
      return d(t2, [{ key: "selectionStart", get: function() {
        var t3;
        try {
          t3 = this._unsafeSelectionStart;
        } catch (t4) {
        }
        return null != t3 ? t3 : this.value.length;
      } }, { key: "selectionEnd", get: function() {
        var t3;
        try {
          t3 = this._unsafeSelectionEnd;
        } catch (t4) {
        }
        return null != t3 ? t3 : this.value.length;
      } }, { key: "select", value: function(t3, e2) {
        if (null != t3 && null != e2 && (t3 !== this.selectionStart || e2 !== this.selectionEnd))
          try {
            this._unsafeSelect(t3, e2);
          } catch (t4) {
          }
      } }, { key: "_unsafeSelect", value: function(t3, e2) {
      } }, { key: "isActive", get: function() {
        return false;
      } }, { key: "bindEvents", value: function(t3) {
      } }, { key: "unbindEvents", value: function() {
      } }]), t2;
    }();
    x.MaskElement = q;
    var Y = function(t2) {
      f(n2, q);
      var e2 = _(n2);
      function n2(t3) {
        var i2;
        return c(this, n2), (i2 = e2.call(this)).input = t3, i2._handlers = {}, i2;
      }
      return d(n2, [{ key: "rootElement", get: function() {
        return this.input.getRootNode ? this.input.getRootNode() : document;
      } }, { key: "isActive", get: function() {
        return this.input === this.rootElement.activeElement;
      } }, { key: "_unsafeSelectionStart", get: function() {
        return this.input.selectionStart;
      } }, { key: "_unsafeSelectionEnd", get: function() {
        return this.input.selectionEnd;
      } }, { key: "_unsafeSelect", value: function(t3, e3) {
        this.input.setSelectionRange(t3, e3);
      } }, { key: "value", get: function() {
        return this.input.value;
      }, set: function(t3) {
        this.input.value = t3;
      } }, { key: "bindEvents", value: function(t3) {
        var e3 = this;
        Object.keys(t3).forEach(function(i2) {
          return e3._toggleEventHandler(n2.EVENTS_MAP[i2], t3[i2]);
        });
      } }, { key: "unbindEvents", value: function() {
        var t3 = this;
        Object.keys(this._handlers).forEach(function(e3) {
          return t3._toggleEventHandler(e3);
        });
      } }, { key: "_toggleEventHandler", value: function(t3, e3) {
        this._handlers[t3] && (this.input.removeEventListener(t3, this._handlers[t3]), delete this._handlers[t3]), e3 && (this.input.addEventListener(t3, e3), this._handlers[t3] = e3);
      } }]), n2;
    }();
    Y.EVENTS_MAP = { selectionChange: "keydown", input: "input", drop: "drop", click: "click", focus: "focus", commit: "blur" }, x.HTMLMaskElement = Y;
    var K = function(t2) {
      f(n2, Y);
      var e2 = _(n2);
      function n2() {
        return c(this, n2), e2.apply(this, arguments);
      }
      return d(n2, [{ key: "_unsafeSelectionStart", get: function() {
        var t3 = this.rootElement, e3 = t3.getSelection && t3.getSelection();
        return e3 && e3.anchorOffset;
      } }, { key: "_unsafeSelectionEnd", get: function() {
        var t3 = this.rootElement, e3 = t3.getSelection && t3.getSelection();
        return e3 && this._unsafeSelectionStart + String(e3).length;
      } }, { key: "_unsafeSelect", value: function(t3, e3) {
        if (this.rootElement.createRange) {
          var n3 = this.rootElement.createRange();
          n3.setStart(this.input.firstChild || this.input, t3), n3.setEnd(this.input.lastChild || this.input, e3);
          var i2 = this.rootElement, s2 = i2.getSelection && i2.getSelection();
          s2 && (s2.removeAllRanges(), s2.addRange(n3));
        }
      } }, { key: "value", get: function() {
        return this.input.textContent;
      }, set: function(t3) {
        this.input.textContent = t3;
      } }]), n2;
    }();
    x.HTMLContenteditableMaskElement = K;
    var X = ["mask"], G = function() {
      function t2(e2, n2) {
        c(this, t2), this.el = e2 instanceof q ? e2 : e2.isContentEditable && "INPUT" !== e2.tagName && "TEXTAREA" !== e2.tagName ? new K(e2) : new Y(e2), this.masked = L(n2), this._listeners = {}, this._value = "", this._unmaskedValue = "", this._saveSelection = this._saveSelection.bind(this), this._onInput = this._onInput.bind(this), this._onChange = this._onChange.bind(this), this._onDrop = this._onDrop.bind(this), this._onFocus = this._onFocus.bind(this), this._onClick = this._onClick.bind(this), this.alignCursor = this.alignCursor.bind(this), this.alignCursorFriendly = this.alignCursorFriendly.bind(this), this._bindEvents(), this.updateValue(), this._onChange();
      }
      return d(t2, [{ key: "mask", get: function() {
        return this.masked.mask;
      }, set: function(t3) {
        if (!this.maskEquals(t3))
          if (t3 instanceof x.Masked || this.masked.constructor !== I(t3)) {
            var e2 = L({ mask: t3 });
            e2.unmaskedValue = this.masked.unmaskedValue, this.masked = e2;
          } else
            this.masked.updateOptions({ mask: t3 });
      } }, { key: "maskEquals", value: function(t3) {
        return null == t3 || t3 === this.masked.mask || t3 === Date && this.masked instanceof U;
      } }, { key: "value", get: function() {
        return this._value;
      }, set: function(t3) {
        this.masked.value = t3, this.updateControl(), this.alignCursor();
      } }, { key: "unmaskedValue", get: function() {
        return this._unmaskedValue;
      }, set: function(t3) {
        this.masked.unmaskedValue = t3, this.updateControl(), this.alignCursor();
      } }, { key: "typedValue", get: function() {
        return this.masked.typedValue;
      }, set: function(t3) {
        this.masked.typedValue = t3, this.updateControl(), this.alignCursor();
      } }, { key: "_bindEvents", value: function() {
        this.el.bindEvents({ selectionChange: this._saveSelection, input: this._onInput, drop: this._onDrop, click: this._onClick, focus: this._onFocus, commit: this._onChange });
      } }, { key: "_unbindEvents", value: function() {
        this.el && this.el.unbindEvents();
      } }, { key: "_fireEvent", value: function(t3) {
        for (var e2 = arguments.length, n2 = new Array(e2 > 1 ? e2 - 1 : 0), i2 = 1; i2 < e2; i2++)
          n2[i2 - 1] = arguments[i2];
        var s2 = this._listeners[t3];
        s2 && s2.forEach(function(t4) {
          return t4.apply(void 0, n2);
        });
      } }, { key: "selectionStart", get: function() {
        return this._cursorChanging ? this._changingCursorPos : this.el.selectionStart;
      } }, { key: "cursorPos", get: function() {
        return this._cursorChanging ? this._changingCursorPos : this.el.selectionEnd;
      }, set: function(t3) {
        this.el && this.el.isActive && (this.el.select(t3, t3), this._saveSelection());
      } }, { key: "_saveSelection", value: function() {
        this.value !== this.el.value && console.warn("Element value was changed outside of mask. Syncronize mask using `mask.updateValue()` to work properly."), this._selection = { start: this.selectionStart, end: this.cursorPos };
      } }, { key: "updateValue", value: function() {
        this.masked.value = this.el.value, this._value = this.masked.value;
      } }, { key: "updateControl", value: function() {
        var t3 = this.masked.unmaskedValue, e2 = this.masked.value, n2 = this.unmaskedValue !== t3 || this.value !== e2;
        this._unmaskedValue = t3, this._value = e2, this.el.value !== e2 && (this.el.value = e2), n2 && this._fireChangeEvents();
      } }, { key: "updateOptions", value: function(t3) {
        var e2 = t3.mask, n2 = m(t3, X), i2 = !this.maskEquals(e2), s2 = !function t4(e3, n3) {
          if (n3 === e3)
            return true;
          var i3, s3 = Array.isArray(n3), r2 = Array.isArray(e3);
          if (s3 && r2) {
            if (n3.length != e3.length)
              return false;
            for (i3 = 0; i3 < n3.length; i3++)
              if (!t4(n3[i3], e3[i3]))
                return false;
            return true;
          }
          if (s3 != r2)
            return false;
          if (n3 && e3 && "object" === l(n3) && "object" === l(e3)) {
            var o2 = n3 instanceof Date, a2 = e3 instanceof Date;
            if (o2 && a2)
              return n3.getTime() == e3.getTime();
            if (o2 != a2)
              return false;
            var u2 = n3 instanceof RegExp, c2 = e3 instanceof RegExp;
            if (u2 && c2)
              return n3.toString() == e3.toString();
            if (u2 != c2)
              return false;
            var h2 = Object.keys(n3);
            for (i3 = 0; i3 < h2.length; i3++)
              if (!Object.prototype.hasOwnProperty.call(e3, h2[i3]))
                return false;
            for (i3 = 0; i3 < h2.length; i3++)
              if (!t4(e3[h2[i3]], n3[h2[i3]]))
                return false;
            return true;
          }
          return !(!n3 || !e3 || "function" != typeof n3 || "function" != typeof e3) && n3.toString() === e3.toString();
        }(this.masked, n2);
        i2 && (this.mask = e2), s2 && this.masked.updateOptions(n2), (i2 || s2) && this.updateControl();
      } }, { key: "updateCursor", value: function(t3) {
        null != t3 && (this.cursorPos = t3, this._delayUpdateCursor(t3));
      } }, { key: "_delayUpdateCursor", value: function(t3) {
        var e2 = this;
        this._abortUpdateCursor(), this._changingCursorPos = t3, this._cursorChanging = setTimeout(function() {
          e2.el && (e2.cursorPos = e2._changingCursorPos, e2._abortUpdateCursor());
        }, 10);
      } }, { key: "_fireChangeEvents", value: function() {
        this._fireEvent("accept", this._inputEvent), this.masked.isComplete && this._fireEvent("complete", this._inputEvent);
      } }, { key: "_abortUpdateCursor", value: function() {
        this._cursorChanging && (clearTimeout(this._cursorChanging), delete this._cursorChanging);
      } }, { key: "alignCursor", value: function() {
        this.cursorPos = this.masked.nearestInputPos(this.cursorPos, S.LEFT);
      } }, { key: "alignCursorFriendly", value: function() {
        this.selectionStart === this.cursorPos && this.alignCursor();
      } }, { key: "on", value: function(t3, e2) {
        return this._listeners[t3] || (this._listeners[t3] = []), this._listeners[t3].push(e2), this;
      } }, { key: "off", value: function(t3, e2) {
        if (!this._listeners[t3])
          return this;
        if (!e2)
          return delete this._listeners[t3], this;
        var n2 = this._listeners[t3].indexOf(e2);
        return n2 >= 0 && this._listeners[t3].splice(n2, 1), this;
      } }, { key: "_onInput", value: function(t3) {
        if (this._inputEvent = t3, this._abortUpdateCursor(), !this._selection)
          return this.updateValue();
        var e2 = new D(this.el.value, this.cursorPos, this.value, this._selection), n2 = this.masked.rawInputValue, i2 = this.masked.splice(e2.startChangePos, e2.removed.length, e2.inserted, e2.removeDirection).offset, s2 = n2 === this.masked.rawInputValue ? e2.removeDirection : S.NONE, r2 = this.masked.nearestInputPos(e2.startChangePos + i2, s2);
        this.updateControl(), this.updateCursor(r2), delete this._inputEvent;
      } }, { key: "_onChange", value: function() {
        this.value !== this.el.value && this.updateValue(), this.masked.doCommit(), this.updateControl(), this._saveSelection();
      } }, { key: "_onDrop", value: function(t3) {
        t3.preventDefault(), t3.stopPropagation();
      } }, { key: "_onFocus", value: function(t3) {
        this.alignCursorFriendly();
      } }, { key: "_onClick", value: function(t3) {
        this.alignCursorFriendly();
      } }, { key: "destroy", value: function() {
        this._unbindEvents(), this._listeners.length = 0, delete this.el;
      } }]), t2;
    }();
    x.InputMask = G;
    var Q = function(t2) {
      f(n2, z);
      var e2 = _(n2);
      function n2() {
        return c(this, n2), e2.apply(this, arguments);
      }
      return d(n2, [{ key: "_update", value: function(t3) {
        t3.enum && (t3.mask = "*".repeat(t3.enum[0].length)), b(p(n2.prototype), "_update", this).call(this, t3);
      } }, { key: "doValidate", value: function() {
        for (var t3, e3 = this, i2 = arguments.length, s2 = new Array(i2), r2 = 0; r2 < i2; r2++)
          s2[r2] = arguments[r2];
        return this.enum.some(function(t4) {
          return t4.indexOf(e3.unmaskedValue) >= 0;
        }) && (t3 = b(p(n2.prototype), "doValidate", this)).call.apply(t3, [this].concat(s2));
      } }]), n2;
    }();
    x.MaskedEnum = Q;
    var Z = function(t2) {
      f(n2, B);
      var e2 = _(n2);
      function n2(t3) {
        return c(this, n2), e2.call(this, Object.assign({}, n2.DEFAULTS, t3));
      }
      return d(n2, [{ key: "_update", value: function(t3) {
        b(p(n2.prototype), "_update", this).call(this, t3), this._updateRegExps();
      } }, { key: "_updateRegExps", value: function() {
        var t3 = "^" + (this.allowNegative ? "[+|\\-]?" : ""), e3 = (this.scale ? "(" + T(this.radix) + "\\d{0," + this.scale + "})?" : "") + "$";
        this._numberRegExpInput = new RegExp(t3 + "(0|([1-9]+\\d*))?" + e3), this._numberRegExp = new RegExp(t3 + "\\d*" + e3), this._mapToRadixRegExp = new RegExp("[" + this.mapToRadix.map(T).join("") + "]", "g"), this._thousandsSeparatorRegExp = new RegExp(T(this.thousandsSeparator), "g");
      } }, { key: "_removeThousandsSeparators", value: function(t3) {
        return t3.replace(this._thousandsSeparatorRegExp, "");
      } }, { key: "_insertThousandsSeparators", value: function(t3) {
        var e3 = t3.split(this.radix);
        return e3[0] = e3[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.thousandsSeparator), e3.join(this.radix);
      } }, { key: "doPrepare", value: function(t3) {
        for (var e3, i2 = arguments.length, s2 = new Array(i2 > 1 ? i2 - 1 : 0), r2 = 1; r2 < i2; r2++)
          s2[r2 - 1] = arguments[r2];
        return (e3 = b(p(n2.prototype), "doPrepare", this)).call.apply(e3, [this, this._removeThousandsSeparators(t3.replace(this._mapToRadixRegExp, this.radix))].concat(s2));
      } }, { key: "_separatorsCount", value: function(t3) {
        for (var e3 = arguments.length > 1 && void 0 !== arguments[1] && arguments[1], n3 = 0, i2 = 0; i2 < t3; ++i2)
          this._value.indexOf(this.thousandsSeparator, i2) === i2 && (++n3, e3 && (t3 += this.thousandsSeparator.length));
        return n3;
      } }, { key: "_separatorsCountFromSlice", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : this._value;
        return this._separatorsCount(this._removeThousandsSeparators(t3).length, true);
      } }, { key: "extractInput", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, i2 = arguments.length > 2 ? arguments[2] : void 0, s2 = w(this._adjustRangeWithSeparators(t3, e3), 2);
        return t3 = s2[0], e3 = s2[1], this._removeThousandsSeparators(b(p(n2.prototype), "extractInput", this).call(this, t3, e3, i2));
      } }, { key: "_appendCharRaw", value: function(t3) {
        var e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        if (!this.thousandsSeparator)
          return b(p(n2.prototype), "_appendCharRaw", this).call(this, t3, e3);
        var i2 = e3.tail && e3._beforeTailState ? e3._beforeTailState._value : this._value, s2 = this._separatorsCountFromSlice(i2);
        this._value = this._removeThousandsSeparators(this.value);
        var r2 = b(p(n2.prototype), "_appendCharRaw", this).call(this, t3, e3);
        this._value = this._insertThousandsSeparators(this._value);
        var o2 = e3.tail && e3._beforeTailState ? e3._beforeTailState._value : this._value, a2 = this._separatorsCountFromSlice(o2);
        return r2.tailShift += (a2 - s2) * this.thousandsSeparator.length, r2.skip = !r2.rawInserted && t3 === this.thousandsSeparator, r2;
      } }, { key: "_findSeparatorAround", value: function(t3) {
        if (this.thousandsSeparator) {
          var e3 = t3 - this.thousandsSeparator.length + 1, n3 = this.value.indexOf(this.thousandsSeparator, e3);
          if (n3 <= t3)
            return n3;
        }
        return -1;
      } }, { key: "_adjustRangeWithSeparators", value: function(t3, e3) {
        var n3 = this._findSeparatorAround(t3);
        n3 >= 0 && (t3 = n3);
        var i2 = this._findSeparatorAround(e3);
        return i2 >= 0 && (e3 = i2 + this.thousandsSeparator.length), [t3, e3];
      } }, { key: "remove", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : this.value.length, n3 = w(this._adjustRangeWithSeparators(t3, e3), 2);
        t3 = n3[0], e3 = n3[1];
        var i2 = this.value.slice(0, t3), s2 = this.value.slice(e3), r2 = this._separatorsCount(i2.length);
        this._value = this._insertThousandsSeparators(this._removeThousandsSeparators(i2 + s2));
        var o2 = this._separatorsCountFromSlice(i2);
        return new O({ tailShift: (o2 - r2) * this.thousandsSeparator.length });
      } }, { key: "nearestInputPos", value: function(t3, e3) {
        if (!this.thousandsSeparator)
          return t3;
        switch (e3) {
          case S.NONE:
          case S.LEFT:
          case S.FORCE_LEFT:
            var n3 = this._findSeparatorAround(t3 - 1);
            if (n3 >= 0) {
              var i2 = n3 + this.thousandsSeparator.length;
              if (t3 < i2 || this.value.length <= i2 || e3 === S.FORCE_LEFT)
                return n3;
            }
            break;
          case S.RIGHT:
          case S.FORCE_RIGHT:
            var s2 = this._findSeparatorAround(t3);
            if (s2 >= 0)
              return s2 + this.thousandsSeparator.length;
        }
        return t3;
      } }, { key: "doValidate", value: function(t3) {
        var e3 = (t3.input ? this._numberRegExpInput : this._numberRegExp).test(this._removeThousandsSeparators(this.value));
        if (e3) {
          var i2 = this.number;
          e3 = e3 && !isNaN(i2) && (null == this.min || this.min >= 0 || this.min <= this.number) && (null == this.max || this.max <= 0 || this.number <= this.max);
        }
        return e3 && b(p(n2.prototype), "doValidate", this).call(this, t3);
      } }, { key: "doCommit", value: function() {
        if (this.value) {
          var t3 = this.number, e3 = t3;
          null != this.min && (e3 = Math.max(e3, this.min)), null != this.max && (e3 = Math.min(e3, this.max)), e3 !== t3 && (this.unmaskedValue = String(e3));
          var i2 = this.value;
          this.normalizeZeros && (i2 = this._normalizeZeros(i2)), this.padFractionalZeros && (i2 = this._padFractionalZeros(i2)), this._value = i2;
        }
        b(p(n2.prototype), "doCommit", this).call(this);
      } }, { key: "_normalizeZeros", value: function(t3) {
        var e3 = this._removeThousandsSeparators(t3).split(this.radix);
        return e3[0] = e3[0].replace(/^(\D*)(0*)(\d*)/, function(t4, e4, n3, i2) {
          return e4 + i2;
        }), t3.length && !/\d$/.test(e3[0]) && (e3[0] = e3[0] + "0"), e3.length > 1 && (e3[1] = e3[1].replace(/0*$/, ""), e3[1].length || (e3.length = 1)), this._insertThousandsSeparators(e3.join(this.radix));
      } }, { key: "_padFractionalZeros", value: function(t3) {
        if (!t3)
          return t3;
        var e3 = t3.split(this.radix);
        return e3.length < 2 && e3.push(""), e3[1] = e3[1].padEnd(this.scale, "0"), e3.join(this.radix);
      } }, { key: "unmaskedValue", get: function() {
        return this._removeThousandsSeparators(this._normalizeZeros(this.value)).replace(this.radix, ".");
      }, set: function(t3) {
        E(p(n2.prototype), "unmaskedValue", t3.replace(".", this.radix), this, true);
      } }, { key: "typedValue", get: function() {
        return Number(this.unmaskedValue);
      }, set: function(t3) {
        E(p(n2.prototype), "unmaskedValue", String(t3), this, true);
      } }, { key: "number", get: function() {
        return this.typedValue;
      }, set: function(t3) {
        this.typedValue = t3;
      } }, { key: "allowNegative", get: function() {
        return this.signed || null != this.min && this.min < 0 || null != this.max && this.max < 0;
      } }]), n2;
    }();
    Z.DEFAULTS = { radix: ",", thousandsSeparator: "", mapToRadix: ["."], scale: 2, signed: false, normalizeZeros: true, padFractionalZeros: false }, x.MaskedNumber = Z;
    var J = function(t2) {
      f(n2, B);
      var e2 = _(n2);
      function n2() {
        return c(this, n2), e2.apply(this, arguments);
      }
      return d(n2, [{ key: "_update", value: function(t3) {
        t3.mask && (t3.validate = t3.mask), b(p(n2.prototype), "_update", this).call(this, t3);
      } }]), n2;
    }();
    x.MaskedFunction = J;
    var tt = ["compiledMasks", "currentMaskRef", "currentMask"], et = function(t2) {
      f(n2, B);
      var e2 = _(n2);
      function n2(t3) {
        var i2;
        return c(this, n2), (i2 = e2.call(this, Object.assign({}, n2.DEFAULTS, t3))).currentMask = null, i2;
      }
      return d(n2, [{ key: "_update", value: function(t3) {
        b(p(n2.prototype), "_update", this).call(this, t3), "mask" in t3 && (this.compiledMasks = Array.isArray(t3.mask) ? t3.mask.map(function(t4) {
          return L(t4);
        }) : []);
      } }, { key: "_appendCharRaw", value: function(t3) {
        var e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n3 = this._applyDispatch(t3, e3);
        return this.currentMask && n3.aggregate(this.currentMask._appendChar(t3, e3)), n3;
      } }, { key: "_applyDispatch", value: function() {
        var t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "", e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n3 = e3.tail && null != e3._beforeTailState ? e3._beforeTailState._value : this.value, i2 = this.rawInputValue, s2 = e3.tail && null != e3._beforeTailState ? e3._beforeTailState._rawInputValue : i2, r2 = i2.slice(s2.length), o2 = this.currentMask, a2 = new O(), u2 = o2 && o2.state;
        if (this.currentMask = this.doDispatch(t3, Object.assign({}, e3)), this.currentMask)
          if (this.currentMask !== o2) {
            if (this.currentMask.reset(), s2) {
              var l2 = this.currentMask.append(s2, { raw: true });
              a2.tailShift = l2.inserted.length - n3.length;
            }
            r2 && (a2.tailShift += this.currentMask.append(r2, { raw: true, tail: true }).tailShift);
          } else
            this.currentMask.state = u2;
        return a2;
      } }, { key: "_appendPlaceholder", value: function() {
        var t3 = this._applyDispatch.apply(this, arguments);
        return this.currentMask && t3.aggregate(this.currentMask._appendPlaceholder()), t3;
      } }, { key: "doDispatch", value: function(t3) {
        var e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return this.dispatch(t3, this, e3);
      } }, { key: "doValidate", value: function() {
        for (var t3, e3, i2 = arguments.length, s2 = new Array(i2), r2 = 0; r2 < i2; r2++)
          s2[r2] = arguments[r2];
        return (t3 = b(p(n2.prototype), "doValidate", this)).call.apply(t3, [this].concat(s2)) && (!this.currentMask || (e3 = this.currentMask).doValidate.apply(e3, s2));
      } }, { key: "reset", value: function() {
        this.currentMask && this.currentMask.reset(), this.compiledMasks.forEach(function(t3) {
          return t3.reset();
        });
      } }, { key: "value", get: function() {
        return this.currentMask ? this.currentMask.value : "";
      }, set: function(t3) {
        E(p(n2.prototype), "value", t3, this, true);
      } }, { key: "unmaskedValue", get: function() {
        return this.currentMask ? this.currentMask.unmaskedValue : "";
      }, set: function(t3) {
        E(p(n2.prototype), "unmaskedValue", t3, this, true);
      } }, { key: "typedValue", get: function() {
        return this.currentMask ? this.currentMask.typedValue : "";
      }, set: function(t3) {
        var e3 = String(t3);
        this.currentMask && (this.currentMask.typedValue = t3, e3 = this.currentMask.unmaskedValue), this.unmaskedValue = e3;
      } }, { key: "isComplete", get: function() {
        return !!this.currentMask && this.currentMask.isComplete;
      } }, { key: "remove", value: function() {
        var t3, e3 = new O();
        this.currentMask && e3.aggregate((t3 = this.currentMask).remove.apply(t3, arguments)).aggregate(this._applyDispatch());
        return e3;
      } }, { key: "state", get: function() {
        return Object.assign({}, b(p(n2.prototype), "state", this), { _rawInputValue: this.rawInputValue, compiledMasks: this.compiledMasks.map(function(t3) {
          return t3.state;
        }), currentMaskRef: this.currentMask, currentMask: this.currentMask && this.currentMask.state });
      }, set: function(t3) {
        var e3 = t3.compiledMasks, i2 = t3.currentMaskRef, s2 = t3.currentMask, r2 = m(t3, tt);
        this.compiledMasks.forEach(function(t4, n3) {
          return t4.state = e3[n3];
        }), null != i2 && (this.currentMask = i2, this.currentMask.state = s2), E(p(n2.prototype), "state", r2, this, true);
      } }, { key: "extractInput", value: function() {
        var t3;
        return this.currentMask ? (t3 = this.currentMask).extractInput.apply(t3, arguments) : "";
      } }, { key: "extractTail", value: function() {
        for (var t3, e3, i2 = arguments.length, s2 = new Array(i2), r2 = 0; r2 < i2; r2++)
          s2[r2] = arguments[r2];
        return this.currentMask ? (t3 = this.currentMask).extractTail.apply(t3, s2) : (e3 = b(p(n2.prototype), "extractTail", this)).call.apply(e3, [this].concat(s2));
      } }, { key: "doCommit", value: function() {
        this.currentMask && this.currentMask.doCommit(), b(p(n2.prototype), "doCommit", this).call(this);
      } }, { key: "nearestInputPos", value: function() {
        for (var t3, e3, i2 = arguments.length, s2 = new Array(i2), r2 = 0; r2 < i2; r2++)
          s2[r2] = arguments[r2];
        return this.currentMask ? (t3 = this.currentMask).nearestInputPos.apply(t3, s2) : (e3 = b(p(n2.prototype), "nearestInputPos", this)).call.apply(e3, [this].concat(s2));
      } }, { key: "overwrite", get: function() {
        return this.currentMask ? this.currentMask.overwrite : b(p(n2.prototype), "overwrite", this);
      }, set: function(t3) {
        console.warn('"overwrite" option is not available in dynamic mask, use this option in siblings');
      } }]), n2;
    }();
    et.DEFAULTS = { dispatch: function(t2, e2, n2) {
      if (e2.compiledMasks.length) {
        var i2 = e2.rawInputValue, s2 = e2.compiledMasks.map(function(e3, s3) {
          return e3.reset(), e3.append(i2, { raw: true }), e3.append(t2, n2), { weight: e3.rawInputValue.length, index: s3 };
        });
        return s2.sort(function(t3, e3) {
          return e3.weight - t3.weight;
        }), e2.compiledMasks[s2[0].index];
      }
    } }, x.MaskedDynamic = et;
    var nt = { MASKED: "value", UNMASKED: "unmaskedValue", TYPED: "typedValue" };
    function it(t2) {
      var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : nt.MASKED, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : nt.MASKED, i2 = L(t2);
      return function(t3) {
        return i2.runIsolated(function(i3) {
          return i3[e2] = t3, i3[n2];
        });
      };
    }
    x.PIPE_TYPE = nt, x.createPipe = it, x.pipe = function(t2) {
      for (var e2 = arguments.length, n2 = new Array(e2 > 1 ? e2 - 1 : 0), i2 = 1; i2 < e2; i2++)
        n2[i2 - 1] = arguments[i2];
      return it.apply(void 0, n2)(t2);
    };
    try {
      globalThis.IMask = x;
    } catch (t2) {
    }
    [].slice.call(document.querySelectorAll("[data-mask]")).map(function(t2) {
      return new x(t2, { mask: t2.dataset.mask, lazy: "true" === t2.dataset["mask-visible"] });
    });
    var st = "top", rt = "bottom", ot = "right", at = "left", ut = "auto", lt = [st, rt, ot, at], ct = "start", ht = "end", dt = "clippingParents", ft = "viewport", pt = "popper", gt = "reference", mt = lt.reduce(function(t2, e2) {
      return t2.concat([e2 + "-" + ct, e2 + "-" + ht]);
    }, []), vt = [].concat(lt, [ut]).reduce(function(t2, e2) {
      return t2.concat([e2, e2 + "-" + ct, e2 + "-" + ht]);
    }, []), _t = ["beforeRead", "read", "afterRead", "beforeMain", "main", "afterMain", "beforeWrite", "write", "afterWrite"];
    function yt(t2) {
      return t2 ? (t2.nodeName || "").toLowerCase() : null;
    }
    function bt(t2) {
      if (null == t2)
        return window;
      if ("[object Window]" !== t2.toString()) {
        var e2 = t2.ownerDocument;
        return e2 && e2.defaultView || window;
      }
      return t2;
    }
    function kt(t2) {
      return t2 instanceof bt(t2).Element || t2 instanceof Element;
    }
    function Et(t2) {
      return t2 instanceof bt(t2).HTMLElement || t2 instanceof HTMLElement;
    }
    function wt(t2) {
      return "undefined" != typeof ShadowRoot && (t2 instanceof bt(t2).ShadowRoot || t2 instanceof ShadowRoot);
    }
    var At = { name: "applyStyles", enabled: true, phase: "write", fn: function(t2) {
      var e2 = t2.state;
      Object.keys(e2.elements).forEach(function(t3) {
        var n2 = e2.styles[t3] || {}, i2 = e2.attributes[t3] || {}, s2 = e2.elements[t3];
        Et(s2) && yt(s2) && (Object.assign(s2.style, n2), Object.keys(i2).forEach(function(t4) {
          var e3 = i2[t4];
          false === e3 ? s2.removeAttribute(t4) : s2.setAttribute(t4, true === e3 ? "" : e3);
        }));
      });
    }, effect: function(t2) {
      var e2 = t2.state, n2 = { popper: { position: e2.options.strategy, left: "0", top: "0", margin: "0" }, arrow: { position: "absolute" }, reference: {} };
      return Object.assign(e2.elements.popper.style, n2.popper), e2.styles = n2, e2.elements.arrow && Object.assign(e2.elements.arrow.style, n2.arrow), function() {
        Object.keys(e2.elements).forEach(function(t3) {
          var i2 = e2.elements[t3], s2 = e2.attributes[t3] || {}, r2 = Object.keys(e2.styles.hasOwnProperty(t3) ? e2.styles[t3] : n2[t3]).reduce(function(t4, e3) {
            return t4[e3] = "", t4;
          }, {});
          Et(i2) && yt(i2) && (Object.assign(i2.style, r2), Object.keys(s2).forEach(function(t4) {
            i2.removeAttribute(t4);
          }));
        });
      };
    }, requires: ["computeStyles"] };
    function Ct(t2) {
      return t2.split("-")[0];
    }
    function St(t2, e2) {
      var n2 = t2.getBoundingClientRect();
      return { width: n2.width / 1, height: n2.height / 1, top: n2.top / 1, right: n2.right / 1, bottom: n2.bottom / 1, left: n2.left / 1, x: n2.left / 1, y: n2.top / 1 };
    }
    function Tt(t2) {
      var e2 = St(t2), n2 = t2.offsetWidth, i2 = t2.offsetHeight;
      return Math.abs(e2.width - n2) <= 1 && (n2 = e2.width), Math.abs(e2.height - i2) <= 1 && (i2 = e2.height), { x: t2.offsetLeft, y: t2.offsetTop, width: n2, height: i2 };
    }
    function Dt(t2, e2) {
      var n2 = e2.getRootNode && e2.getRootNode();
      if (t2.contains(e2))
        return true;
      if (n2 && wt(n2)) {
        var i2 = e2;
        do {
          if (i2 && t2.isSameNode(i2))
            return true;
          i2 = i2.parentNode || i2.host;
        } while (i2);
      }
      return false;
    }
    function Ot(t2) {
      return bt(t2).getComputedStyle(t2);
    }
    function Ft(t2) {
      return ["table", "td", "th"].indexOf(yt(t2)) >= 0;
    }
    function xt(t2) {
      return ((kt(t2) ? t2.ownerDocument : t2.document) || window.document).documentElement;
    }
    function Bt(t2) {
      return "html" === yt(t2) ? t2 : t2.assignedSlot || t2.parentNode || (wt(t2) ? t2.host : null) || xt(t2);
    }
    function It(t2) {
      return Et(t2) && "fixed" !== Ot(t2).position ? t2.offsetParent : null;
    }
    function Lt(t2) {
      for (var e2 = bt(t2), n2 = It(t2); n2 && Ft(n2) && "static" === Ot(n2).position; )
        n2 = It(n2);
      return n2 && ("html" === yt(n2) || "body" === yt(n2) && "static" === Ot(n2).position) ? e2 : n2 || function(t3) {
        var e3 = -1 !== navigator.userAgent.toLowerCase().indexOf("firefox");
        if (-1 !== navigator.userAgent.indexOf("Trident") && Et(t3) && "fixed" === Ot(t3).position)
          return null;
        for (var n3 = Bt(t3); Et(n3) && ["html", "body"].indexOf(yt(n3)) < 0; ) {
          var i2 = Ot(n3);
          if ("none" !== i2.transform || "none" !== i2.perspective || "paint" === i2.contain || -1 !== ["transform", "perspective"].indexOf(i2.willChange) || e3 && "filter" === i2.willChange || e3 && i2.filter && "none" !== i2.filter)
            return n3;
          n3 = n3.parentNode;
        }
        return null;
      }(t2) || e2;
    }
    function Pt(t2) {
      return ["top", "bottom"].indexOf(t2) >= 0 ? "x" : "y";
    }
    var Mt = Math.max, Nt = Math.min, Rt = Math.round;
    function jt(t2, e2, n2) {
      return Mt(t2, Nt(e2, n2));
    }
    function Vt(t2) {
      return Object.assign({}, { top: 0, right: 0, bottom: 0, left: 0 }, t2);
    }
    function Ht(t2, e2) {
      return e2.reduce(function(e3, n2) {
        return e3[n2] = t2, e3;
      }, {});
    }
    var $t = function(t2, e2) {
      return Vt("number" != typeof (t2 = "function" == typeof t2 ? t2(Object.assign({}, e2.rects, { placement: e2.placement })) : t2) ? t2 : Ht(t2, lt));
    };
    var zt = { name: "arrow", enabled: true, phase: "main", fn: function(t2) {
      var e2, n2 = t2.state, i2 = t2.name, s2 = t2.options, r2 = n2.elements.arrow, o2 = n2.modifiersData.popperOffsets, a2 = Ct(n2.placement), u2 = Pt(a2), l2 = [at, ot].indexOf(a2) >= 0 ? "height" : "width";
      if (r2 && o2) {
        var c2 = $t(s2.padding, n2), h2 = Tt(r2), d2 = "y" === u2 ? st : at, f2 = "y" === u2 ? rt : ot, p2 = n2.rects.reference[l2] + n2.rects.reference[u2] - o2[u2] - n2.rects.popper[l2], g2 = o2[u2] - n2.rects.reference[u2], m2 = Lt(r2), v2 = m2 ? "y" === u2 ? m2.clientHeight || 0 : m2.clientWidth || 0 : 0, _2 = p2 / 2 - g2 / 2, y2 = c2[d2], b2 = v2 - h2[l2] - c2[f2], k2 = v2 / 2 - h2[l2] / 2 + _2, E2 = jt(y2, k2, b2), w2 = u2;
        n2.modifiersData[i2] = ((e2 = {})[w2] = E2, e2.centerOffset = E2 - k2, e2);
      }
    }, effect: function(t2) {
      var e2 = t2.state, n2 = t2.options.element, i2 = void 0 === n2 ? "[data-popper-arrow]" : n2;
      null != i2 && ("string" != typeof i2 || (i2 = e2.elements.popper.querySelector(i2))) && Dt(e2.elements.popper, i2) && (e2.elements.arrow = i2);
    }, requires: ["popperOffsets"], requiresIfExists: ["preventOverflow"] };
    function Wt(t2) {
      return t2.split("-")[1];
    }
    var Ut = { top: "auto", right: "auto", bottom: "auto", left: "auto" };
    function qt(t2) {
      var e2, n2 = t2.popper, i2 = t2.popperRect, s2 = t2.placement, r2 = t2.variation, o2 = t2.offsets, a2 = t2.position, u2 = t2.gpuAcceleration, l2 = t2.adaptive, c2 = t2.roundOffsets, h2 = true === c2 ? function(t3) {
        var e3 = t3.x, n3 = t3.y, i3 = window.devicePixelRatio || 1;
        return { x: Rt(Rt(e3 * i3) / i3) || 0, y: Rt(Rt(n3 * i3) / i3) || 0 };
      }(o2) : "function" == typeof c2 ? c2(o2) : o2, d2 = h2.x, f2 = void 0 === d2 ? 0 : d2, p2 = h2.y, g2 = void 0 === p2 ? 0 : p2, m2 = o2.hasOwnProperty("x"), v2 = o2.hasOwnProperty("y"), _2 = at, y2 = st, b2 = window;
      if (l2) {
        var k2 = Lt(n2), E2 = "clientHeight", w2 = "clientWidth";
        k2 === bt(n2) && "static" !== Ot(k2 = xt(n2)).position && "absolute" === a2 && (E2 = "scrollHeight", w2 = "scrollWidth"), k2 = k2, s2 !== st && (s2 !== at && s2 !== ot || r2 !== ht) || (y2 = rt, g2 -= k2[E2] - i2.height, g2 *= u2 ? 1 : -1), s2 !== at && (s2 !== st && s2 !== rt || r2 !== ht) || (_2 = ot, f2 -= k2[w2] - i2.width, f2 *= u2 ? 1 : -1);
      }
      var A2, C2 = Object.assign({ position: a2 }, l2 && Ut);
      return u2 ? Object.assign({}, C2, ((A2 = {})[y2] = v2 ? "0" : "", A2[_2] = m2 ? "0" : "", A2.transform = (b2.devicePixelRatio || 1) <= 1 ? "translate(" + f2 + "px, " + g2 + "px)" : "translate3d(" + f2 + "px, " + g2 + "px, 0)", A2)) : Object.assign({}, C2, ((e2 = {})[y2] = v2 ? g2 + "px" : "", e2[_2] = m2 ? f2 + "px" : "", e2.transform = "", e2));
    }
    var Yt = { name: "computeStyles", enabled: true, phase: "beforeWrite", fn: function(t2) {
      var e2 = t2.state, n2 = t2.options, i2 = n2.gpuAcceleration, s2 = void 0 === i2 || i2, r2 = n2.adaptive, o2 = void 0 === r2 || r2, a2 = n2.roundOffsets, u2 = void 0 === a2 || a2, l2 = { placement: Ct(e2.placement), variation: Wt(e2.placement), popper: e2.elements.popper, popperRect: e2.rects.popper, gpuAcceleration: s2 };
      null != e2.modifiersData.popperOffsets && (e2.styles.popper = Object.assign({}, e2.styles.popper, qt(Object.assign({}, l2, { offsets: e2.modifiersData.popperOffsets, position: e2.options.strategy, adaptive: o2, roundOffsets: u2 })))), null != e2.modifiersData.arrow && (e2.styles.arrow = Object.assign({}, e2.styles.arrow, qt(Object.assign({}, l2, { offsets: e2.modifiersData.arrow, position: "absolute", adaptive: false, roundOffsets: u2 })))), e2.attributes.popper = Object.assign({}, e2.attributes.popper, { "data-popper-placement": e2.placement });
    }, data: {} }, Kt = { passive: true };
    var Xt = { name: "eventListeners", enabled: true, phase: "write", fn: function() {
    }, effect: function(t2) {
      var e2 = t2.state, n2 = t2.instance, i2 = t2.options, s2 = i2.scroll, r2 = void 0 === s2 || s2, o2 = i2.resize, a2 = void 0 === o2 || o2, u2 = bt(e2.elements.popper), l2 = [].concat(e2.scrollParents.reference, e2.scrollParents.popper);
      return r2 && l2.forEach(function(t3) {
        t3.addEventListener("scroll", n2.update, Kt);
      }), a2 && u2.addEventListener("resize", n2.update, Kt), function() {
        r2 && l2.forEach(function(t3) {
          t3.removeEventListener("scroll", n2.update, Kt);
        }), a2 && u2.removeEventListener("resize", n2.update, Kt);
      };
    }, data: {} }, Gt = { left: "right", right: "left", bottom: "top", top: "bottom" };
    function Qt(t2) {
      return t2.replace(/left|right|bottom|top/g, function(t3) {
        return Gt[t3];
      });
    }
    var Zt = { start: "end", end: "start" };
    function Jt(t2) {
      return t2.replace(/start|end/g, function(t3) {
        return Zt[t3];
      });
    }
    function te(t2) {
      var e2 = bt(t2);
      return { scrollLeft: e2.pageXOffset, scrollTop: e2.pageYOffset };
    }
    function ee(t2) {
      return St(xt(t2)).left + te(t2).scrollLeft;
    }
    function ne(t2) {
      var e2 = Ot(t2), n2 = e2.overflow, i2 = e2.overflowX, s2 = e2.overflowY;
      return /auto|scroll|overlay|hidden/.test(n2 + s2 + i2);
    }
    function ie(t2, e2) {
      var n2;
      void 0 === e2 && (e2 = []);
      var i2 = function t3(e3) {
        return ["html", "body", "#document"].indexOf(yt(e3)) >= 0 ? e3.ownerDocument.body : Et(e3) && ne(e3) ? e3 : t3(Bt(e3));
      }(t2), s2 = i2 === (null == (n2 = t2.ownerDocument) ? void 0 : n2.body), r2 = bt(i2), o2 = s2 ? [r2].concat(r2.visualViewport || [], ne(i2) ? i2 : []) : i2, a2 = e2.concat(o2);
      return s2 ? a2 : a2.concat(ie(Bt(o2)));
    }
    function se(t2) {
      return Object.assign({}, t2, { left: t2.x, top: t2.y, right: t2.x + t2.width, bottom: t2.y + t2.height });
    }
    function re(t2, e2) {
      return e2 === ft ? se(function(t3) {
        var e3 = bt(t3), n2 = xt(t3), i2 = e3.visualViewport, s2 = n2.clientWidth, r2 = n2.clientHeight, o2 = 0, a2 = 0;
        return i2 && (s2 = i2.width, r2 = i2.height, /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || (o2 = i2.offsetLeft, a2 = i2.offsetTop)), { width: s2, height: r2, x: o2 + ee(t3), y: a2 };
      }(t2)) : Et(e2) ? function(t3) {
        var e3 = St(t3);
        return e3.top = e3.top + t3.clientTop, e3.left = e3.left + t3.clientLeft, e3.bottom = e3.top + t3.clientHeight, e3.right = e3.left + t3.clientWidth, e3.width = t3.clientWidth, e3.height = t3.clientHeight, e3.x = e3.left, e3.y = e3.top, e3;
      }(e2) : se(function(t3) {
        var e3, n2 = xt(t3), i2 = te(t3), s2 = null == (e3 = t3.ownerDocument) ? void 0 : e3.body, r2 = Mt(n2.scrollWidth, n2.clientWidth, s2 ? s2.scrollWidth : 0, s2 ? s2.clientWidth : 0), o2 = Mt(n2.scrollHeight, n2.clientHeight, s2 ? s2.scrollHeight : 0, s2 ? s2.clientHeight : 0), a2 = -i2.scrollLeft + ee(t3), u2 = -i2.scrollTop;
        return "rtl" === Ot(s2 || n2).direction && (a2 += Mt(n2.clientWidth, s2 ? s2.clientWidth : 0) - r2), { width: r2, height: o2, x: a2, y: u2 };
      }(xt(t2)));
    }
    function oe(t2, e2, n2) {
      var i2 = "clippingParents" === e2 ? function(t3) {
        var e3 = ie(Bt(t3)), n3 = ["absolute", "fixed"].indexOf(Ot(t3).position) >= 0 && Et(t3) ? Lt(t3) : t3;
        return kt(n3) ? e3.filter(function(t4) {
          return kt(t4) && Dt(t4, n3) && "body" !== yt(t4);
        }) : [];
      }(t2) : [].concat(e2), s2 = [].concat(i2, [n2]), r2 = s2[0], o2 = s2.reduce(function(e3, n3) {
        var i3 = re(t2, n3);
        return e3.top = Mt(i3.top, e3.top), e3.right = Nt(i3.right, e3.right), e3.bottom = Nt(i3.bottom, e3.bottom), e3.left = Mt(i3.left, e3.left), e3;
      }, re(t2, r2));
      return o2.width = o2.right - o2.left, o2.height = o2.bottom - o2.top, o2.x = o2.left, o2.y = o2.top, o2;
    }
    function ae(t2) {
      var e2, n2 = t2.reference, i2 = t2.element, s2 = t2.placement, r2 = s2 ? Ct(s2) : null, o2 = s2 ? Wt(s2) : null, a2 = n2.x + n2.width / 2 - i2.width / 2, u2 = n2.y + n2.height / 2 - i2.height / 2;
      switch (r2) {
        case st:
          e2 = { x: a2, y: n2.y - i2.height };
          break;
        case rt:
          e2 = { x: a2, y: n2.y + n2.height };
          break;
        case ot:
          e2 = { x: n2.x + n2.width, y: u2 };
          break;
        case at:
          e2 = { x: n2.x - i2.width, y: u2 };
          break;
        default:
          e2 = { x: n2.x, y: n2.y };
      }
      var l2 = r2 ? Pt(r2) : null;
      if (null != l2) {
        var c2 = "y" === l2 ? "height" : "width";
        switch (o2) {
          case ct:
            e2[l2] = e2[l2] - (n2[c2] / 2 - i2[c2] / 2);
            break;
          case ht:
            e2[l2] = e2[l2] + (n2[c2] / 2 - i2[c2] / 2);
        }
      }
      return e2;
    }
    function ue(t2, e2) {
      void 0 === e2 && (e2 = {});
      var n2 = e2, i2 = n2.placement, s2 = void 0 === i2 ? t2.placement : i2, r2 = n2.boundary, o2 = void 0 === r2 ? dt : r2, a2 = n2.rootBoundary, u2 = void 0 === a2 ? ft : a2, l2 = n2.elementContext, c2 = void 0 === l2 ? pt : l2, h2 = n2.altBoundary, d2 = void 0 !== h2 && h2, f2 = n2.padding, p2 = void 0 === f2 ? 0 : f2, g2 = Vt("number" != typeof p2 ? p2 : Ht(p2, lt)), m2 = c2 === pt ? gt : pt, v2 = t2.rects.popper, _2 = t2.elements[d2 ? m2 : c2], y2 = oe(kt(_2) ? _2 : _2.contextElement || xt(t2.elements.popper), o2, u2), b2 = St(t2.elements.reference), k2 = ae({ reference: b2, element: v2, strategy: "absolute", placement: s2 }), E2 = se(Object.assign({}, v2, k2)), w2 = c2 === pt ? E2 : b2, A2 = { top: y2.top - w2.top + g2.top, bottom: w2.bottom - y2.bottom + g2.bottom, left: y2.left - w2.left + g2.left, right: w2.right - y2.right + g2.right }, C2 = t2.modifiersData.offset;
      if (c2 === pt && C2) {
        var S2 = C2[s2];
        Object.keys(A2).forEach(function(t3) {
          var e3 = [ot, rt].indexOf(t3) >= 0 ? 1 : -1, n3 = [st, rt].indexOf(t3) >= 0 ? "y" : "x";
          A2[t3] += S2[n3] * e3;
        });
      }
      return A2;
    }
    function le(t2, e2) {
      void 0 === e2 && (e2 = {});
      var n2 = e2, i2 = n2.placement, s2 = n2.boundary, r2 = n2.rootBoundary, o2 = n2.padding, a2 = n2.flipVariations, u2 = n2.allowedAutoPlacements, l2 = void 0 === u2 ? vt : u2, c2 = Wt(i2), h2 = c2 ? a2 ? mt : mt.filter(function(t3) {
        return Wt(t3) === c2;
      }) : lt, d2 = h2.filter(function(t3) {
        return l2.indexOf(t3) >= 0;
      });
      0 === d2.length && (d2 = h2);
      var f2 = d2.reduce(function(e3, n3) {
        return e3[n3] = ue(t2, { placement: n3, boundary: s2, rootBoundary: r2, padding: o2 })[Ct(n3)], e3;
      }, {});
      return Object.keys(f2).sort(function(t3, e3) {
        return f2[t3] - f2[e3];
      });
    }
    var ce = { name: "flip", enabled: true, phase: "main", fn: function(t2) {
      var e2 = t2.state, n2 = t2.options, i2 = t2.name;
      if (!e2.modifiersData[i2]._skip) {
        for (var s2 = n2.mainAxis, r2 = void 0 === s2 || s2, o2 = n2.altAxis, a2 = void 0 === o2 || o2, u2 = n2.fallbackPlacements, l2 = n2.padding, c2 = n2.boundary, h2 = n2.rootBoundary, d2 = n2.altBoundary, f2 = n2.flipVariations, p2 = void 0 === f2 || f2, g2 = n2.allowedAutoPlacements, m2 = e2.options.placement, v2 = Ct(m2), _2 = u2 || (v2 !== m2 && p2 ? function(t3) {
          if (Ct(t3) === ut)
            return [];
          var e3 = Qt(t3);
          return [Jt(t3), e3, Jt(e3)];
        }(m2) : [Qt(m2)]), y2 = [m2].concat(_2).reduce(function(t3, n3) {
          return t3.concat(Ct(n3) === ut ? le(e2, { placement: n3, boundary: c2, rootBoundary: h2, padding: l2, flipVariations: p2, allowedAutoPlacements: g2 }) : n3);
        }, []), b2 = e2.rects.reference, k2 = e2.rects.popper, E2 = /* @__PURE__ */ new Map(), w2 = true, A2 = y2[0], C2 = 0; C2 < y2.length; C2++) {
          var S2 = y2[C2], T2 = Ct(S2), D2 = Wt(S2) === ct, O2 = [st, rt].indexOf(T2) >= 0, F2 = O2 ? "width" : "height", x2 = ue(e2, { placement: S2, boundary: c2, rootBoundary: h2, altBoundary: d2, padding: l2 }), B2 = O2 ? D2 ? ot : at : D2 ? rt : st;
          b2[F2] > k2[F2] && (B2 = Qt(B2));
          var I2 = Qt(B2), L2 = [];
          if (r2 && L2.push(x2[T2] <= 0), a2 && L2.push(x2[B2] <= 0, x2[I2] <= 0), L2.every(function(t3) {
            return t3;
          })) {
            A2 = S2, w2 = false;
            break;
          }
          E2.set(S2, L2);
        }
        if (w2)
          for (var P2 = function(t3) {
            var e3 = y2.find(function(e4) {
              var n3 = E2.get(e4);
              if (n3)
                return n3.slice(0, t3).every(function(t4) {
                  return t4;
                });
            });
            if (e3)
              return A2 = e3, "break";
          }, M2 = p2 ? 3 : 1; M2 > 0 && "break" !== P2(M2); M2--)
            ;
        e2.placement !== A2 && (e2.modifiersData[i2]._skip = true, e2.placement = A2, e2.reset = true);
      }
    }, requiresIfExists: ["offset"], data: { _skip: false } };
    function he(t2, e2, n2) {
      return void 0 === n2 && (n2 = { x: 0, y: 0 }), { top: t2.top - e2.height - n2.y, right: t2.right - e2.width + n2.x, bottom: t2.bottom - e2.height + n2.y, left: t2.left - e2.width - n2.x };
    }
    function de(t2) {
      return [st, ot, rt, at].some(function(e2) {
        return t2[e2] >= 0;
      });
    }
    var fe = { name: "hide", enabled: true, phase: "main", requiresIfExists: ["preventOverflow"], fn: function(t2) {
      var e2 = t2.state, n2 = t2.name, i2 = e2.rects.reference, s2 = e2.rects.popper, r2 = e2.modifiersData.preventOverflow, o2 = ue(e2, { elementContext: "reference" }), a2 = ue(e2, { altBoundary: true }), u2 = he(o2, i2), l2 = he(a2, s2, r2), c2 = de(u2), h2 = de(l2);
      e2.modifiersData[n2] = { referenceClippingOffsets: u2, popperEscapeOffsets: l2, isReferenceHidden: c2, hasPopperEscaped: h2 }, e2.attributes.popper = Object.assign({}, e2.attributes.popper, { "data-popper-reference-hidden": c2, "data-popper-escaped": h2 });
    } };
    var pe = { name: "offset", enabled: true, phase: "main", requires: ["popperOffsets"], fn: function(t2) {
      var e2 = t2.state, n2 = t2.options, i2 = t2.name, s2 = n2.offset, r2 = void 0 === s2 ? [0, 0] : s2, o2 = vt.reduce(function(t3, n3) {
        return t3[n3] = function(t4, e3, n4) {
          var i3 = Ct(t4), s3 = [at, st].indexOf(i3) >= 0 ? -1 : 1, r3 = "function" == typeof n4 ? n4(Object.assign({}, e3, { placement: t4 })) : n4, o3 = r3[0], a3 = r3[1];
          return o3 = o3 || 0, a3 = (a3 || 0) * s3, [at, ot].indexOf(i3) >= 0 ? { x: a3, y: o3 } : { x: o3, y: a3 };
        }(n3, e2.rects, r2), t3;
      }, {}), a2 = o2[e2.placement], u2 = a2.x, l2 = a2.y;
      null != e2.modifiersData.popperOffsets && (e2.modifiersData.popperOffsets.x += u2, e2.modifiersData.popperOffsets.y += l2), e2.modifiersData[i2] = o2;
    } };
    var ge = { name: "popperOffsets", enabled: true, phase: "read", fn: function(t2) {
      var e2 = t2.state, n2 = t2.name;
      e2.modifiersData[n2] = ae({ reference: e2.rects.reference, element: e2.rects.popper, strategy: "absolute", placement: e2.placement });
    }, data: {} };
    var me = { name: "preventOverflow", enabled: true, phase: "main", fn: function(t2) {
      var e2 = t2.state, n2 = t2.options, i2 = t2.name, s2 = n2.mainAxis, r2 = void 0 === s2 || s2, o2 = n2.altAxis, a2 = void 0 !== o2 && o2, u2 = n2.boundary, l2 = n2.rootBoundary, c2 = n2.altBoundary, h2 = n2.padding, d2 = n2.tether, f2 = void 0 === d2 || d2, p2 = n2.tetherOffset, g2 = void 0 === p2 ? 0 : p2, m2 = ue(e2, { boundary: u2, rootBoundary: l2, padding: h2, altBoundary: c2 }), v2 = Ct(e2.placement), _2 = Wt(e2.placement), y2 = !_2, b2 = Pt(v2), k2 = "x" === b2 ? "y" : "x", E2 = e2.modifiersData.popperOffsets, w2 = e2.rects.reference, A2 = e2.rects.popper, C2 = "function" == typeof g2 ? g2(Object.assign({}, e2.rects, { placement: e2.placement })) : g2, S2 = { x: 0, y: 0 };
      if (E2) {
        if (r2 || a2) {
          var T2 = "y" === b2 ? st : at, D2 = "y" === b2 ? rt : ot, O2 = "y" === b2 ? "height" : "width", F2 = E2[b2], x2 = E2[b2] + m2[T2], B2 = E2[b2] - m2[D2], I2 = f2 ? -A2[O2] / 2 : 0, L2 = _2 === ct ? w2[O2] : A2[O2], P2 = _2 === ct ? -A2[O2] : -w2[O2], M2 = e2.elements.arrow, N2 = f2 && M2 ? Tt(M2) : { width: 0, height: 0 }, R2 = e2.modifiersData["arrow#persistent"] ? e2.modifiersData["arrow#persistent"].padding : { top: 0, right: 0, bottom: 0, left: 0 }, j2 = R2[T2], V2 = R2[D2], H2 = jt(0, w2[O2], N2[O2]), $2 = y2 ? w2[O2] / 2 - I2 - H2 - j2 - C2 : L2 - H2 - j2 - C2, z2 = y2 ? -w2[O2] / 2 + I2 + H2 + V2 + C2 : P2 + H2 + V2 + C2, W2 = e2.elements.arrow && Lt(e2.elements.arrow), U2 = W2 ? "y" === b2 ? W2.clientTop || 0 : W2.clientLeft || 0 : 0, q2 = e2.modifiersData.offset ? e2.modifiersData.offset[e2.placement][b2] : 0, Y2 = E2[b2] + $2 - q2 - U2, K2 = E2[b2] + z2 - q2;
          if (r2) {
            var X2 = jt(f2 ? Nt(x2, Y2) : x2, F2, f2 ? Mt(B2, K2) : B2);
            E2[b2] = X2, S2[b2] = X2 - F2;
          }
          if (a2) {
            var G2 = "x" === b2 ? st : at, Q2 = "x" === b2 ? rt : ot, Z2 = E2[k2], J2 = Z2 + m2[G2], tt2 = Z2 - m2[Q2], et2 = jt(f2 ? Nt(J2, Y2) : J2, Z2, f2 ? Mt(tt2, K2) : tt2);
            E2[k2] = et2, S2[k2] = et2 - Z2;
          }
        }
        e2.modifiersData[i2] = S2;
      }
    }, requiresIfExists: ["offset"] };
    function ve(t2, e2, n2) {
      void 0 === n2 && (n2 = false);
      var i2 = Et(e2);
      Et(e2) && function(t3) {
        var e3 = t3.getBoundingClientRect(), n3 = e3.width / t3.offsetWidth || 1, i3 = e3.height / t3.offsetHeight || 1;
      }(e2);
      var s2, r2, o2 = xt(e2), a2 = St(t2), u2 = { scrollLeft: 0, scrollTop: 0 }, l2 = { x: 0, y: 0 };
      return (i2 || !i2 && !n2) && (("body" !== yt(e2) || ne(o2)) && (u2 = (s2 = e2) !== bt(s2) && Et(s2) ? { scrollLeft: (r2 = s2).scrollLeft, scrollTop: r2.scrollTop } : te(s2)), Et(e2) ? ((l2 = St(e2)).x += e2.clientLeft, l2.y += e2.clientTop) : o2 && (l2.x = ee(o2))), { x: a2.left + u2.scrollLeft - l2.x, y: a2.top + u2.scrollTop - l2.y, width: a2.width, height: a2.height };
    }
    function _e(t2) {
      var e2 = /* @__PURE__ */ new Map(), n2 = /* @__PURE__ */ new Set(), i2 = [];
      return t2.forEach(function(t3) {
        e2.set(t3.name, t3);
      }), t2.forEach(function(t3) {
        n2.has(t3.name) || function t4(s2) {
          n2.add(s2.name), [].concat(s2.requires || [], s2.requiresIfExists || []).forEach(function(i3) {
            if (!n2.has(i3)) {
              var s3 = e2.get(i3);
              s3 && t4(s3);
            }
          }), i2.push(s2);
        }(t3);
      }), i2;
    }
    var ye = { placement: "bottom", modifiers: [], strategy: "absolute" };
    function be() {
      for (var t2 = arguments.length, e2 = new Array(t2), n2 = 0; n2 < t2; n2++)
        e2[n2] = arguments[n2];
      return !e2.some(function(t3) {
        return !(t3 && "function" == typeof t3.getBoundingClientRect);
      });
    }
    function ke(t2) {
      void 0 === t2 && (t2 = {});
      var e2 = t2, n2 = e2.defaultModifiers, i2 = void 0 === n2 ? [] : n2, s2 = e2.defaultOptions, r2 = void 0 === s2 ? ye : s2;
      return function(t3, e3, n3) {
        void 0 === n3 && (n3 = r2);
        var s3, o2, a2 = { placement: "bottom", orderedModifiers: [], options: Object.assign({}, ye, r2), modifiersData: {}, elements: { reference: t3, popper: e3 }, attributes: {}, styles: {} }, u2 = [], l2 = false, c2 = { state: a2, setOptions: function(n4) {
          var s4 = "function" == typeof n4 ? n4(a2.options) : n4;
          h2(), a2.options = Object.assign({}, r2, a2.options, s4), a2.scrollParents = { reference: kt(t3) ? ie(t3) : t3.contextElement ? ie(t3.contextElement) : [], popper: ie(e3) };
          var o3, l3, d2 = function(t4) {
            var e4 = _e(t4);
            return _t.reduce(function(t5, n5) {
              return t5.concat(e4.filter(function(t6) {
                return t6.phase === n5;
              }));
            }, []);
          }((o3 = [].concat(i2, a2.options.modifiers), l3 = o3.reduce(function(t4, e4) {
            var n5 = t4[e4.name];
            return t4[e4.name] = n5 ? Object.assign({}, n5, e4, { options: Object.assign({}, n5.options, e4.options), data: Object.assign({}, n5.data, e4.data) }) : e4, t4;
          }, {}), Object.keys(l3).map(function(t4) {
            return l3[t4];
          })));
          return a2.orderedModifiers = d2.filter(function(t4) {
            return t4.enabled;
          }), a2.orderedModifiers.forEach(function(t4) {
            var e4 = t4.name, n5 = t4.options, i3 = void 0 === n5 ? {} : n5, s5 = t4.effect;
            if ("function" == typeof s5) {
              var r3 = s5({ state: a2, name: e4, instance: c2, options: i3 });
              u2.push(r3 || function() {
              });
            }
          }), c2.update();
        }, forceUpdate: function() {
          if (!l2) {
            var t4 = a2.elements, e4 = t4.reference, n4 = t4.popper;
            if (be(e4, n4)) {
              a2.rects = { reference: ve(e4, Lt(n4), "fixed" === a2.options.strategy), popper: Tt(n4) }, a2.reset = false, a2.placement = a2.options.placement, a2.orderedModifiers.forEach(function(t5) {
                return a2.modifiersData[t5.name] = Object.assign({}, t5.data);
              });
              for (var i3 = 0; i3 < a2.orderedModifiers.length; i3++)
                if (true !== a2.reset) {
                  var s4 = a2.orderedModifiers[i3], r3 = s4.fn, o3 = s4.options, u3 = void 0 === o3 ? {} : o3, h3 = s4.name;
                  "function" == typeof r3 && (a2 = r3({ state: a2, options: u3, name: h3, instance: c2 }) || a2);
                } else
                  a2.reset = false, i3 = -1;
            }
          }
        }, update: (s3 = function() {
          return new Promise(function(t4) {
            c2.forceUpdate(), t4(a2);
          });
        }, function() {
          return o2 || (o2 = new Promise(function(t4) {
            Promise.resolve().then(function() {
              o2 = void 0, t4(s3());
            });
          })), o2;
        }), destroy: function() {
          h2(), l2 = true;
        } };
        if (!be(t3, e3))
          return c2;
        function h2() {
          u2.forEach(function(t4) {
            return t4();
          }), u2 = [];
        }
        return c2.setOptions(n3).then(function(t4) {
          !l2 && n3.onFirstUpdate && n3.onFirstUpdate(t4);
        }), c2;
      };
    }
    var Ee = ke(), we = ke({ defaultModifiers: [Xt, ge, Yt, At] }), Ae = ke({ defaultModifiers: [Xt, ge, Yt, At, pe, ce, me, zt, fe] }), Ce = Object.freeze({ __proto__: null, popperGenerator: ke, detectOverflow: ue, createPopperBase: Ee, createPopper: Ae, createPopperLite: we, top: st, bottom: rt, right: ot, left: at, auto: ut, basePlacements: lt, start: ct, end: ht, clippingParents: dt, viewport: ft, popper: pt, reference: gt, variationPlacements: mt, placements: vt, beforeRead: "beforeRead", read: "read", afterRead: "afterRead", beforeMain: "beforeMain", main: "main", afterMain: "afterMain", beforeWrite: "beforeWrite", write: "write", afterWrite: "afterWrite", modifierPhases: _t, applyStyles: At, arrow: zt, computeStyles: Yt, eventListeners: Xt, flip: ce, hide: fe, offset: pe, popperOffsets: ge, preventOverflow: me });
    const Se = (t2) => {
      do {
        t2 += Math.floor(1e6 * Math.random());
      } while (document.getElementById(t2));
      return t2;
    }, Te = (t2) => {
      let e2 = t2.getAttribute("data-bs-target");
      if (!e2 || "#" === e2) {
        let n2 = t2.getAttribute("href");
        if (!n2 || !n2.includes("#") && !n2.startsWith("."))
          return null;
        n2.includes("#") && !n2.startsWith("#") && (n2 = `#${n2.split("#")[1]}`), e2 = n2 && "#" !== n2 ? n2.trim() : null;
      }
      return e2;
    }, De = (t2) => {
      const e2 = Te(t2);
      return e2 && document.querySelector(e2) ? e2 : null;
    }, Oe = (t2) => {
      const e2 = Te(t2);
      return e2 ? document.querySelector(e2) : null;
    }, Fe = (t2) => {
      t2.dispatchEvent(new Event("transitionend"));
    }, xe = (t2) => !(!t2 || "object" != typeof t2) && (void 0 !== t2.jquery && (t2 = t2[0]), void 0 !== t2.nodeType), Be = (t2) => xe(t2) ? t2.jquery ? t2[0] : t2 : "string" == typeof t2 && t2.length > 0 ? document.querySelector(t2) : null, Ie = (t2, e2, n2) => {
      Object.keys(n2).forEach((i2) => {
        const s2 = n2[i2], r2 = e2[i2], o2 = r2 && xe(r2) ? "element" : ((t3) => null == t3 ? `${t3}` : {}.toString.call(t3).match(/\s([a-z]+)/i)[1].toLowerCase())(r2);
        if (!new RegExp(s2).test(o2))
          throw new TypeError(`${t2.toUpperCase()}: Option "${i2}" provided type "${o2}" but expected type "${s2}".`);
      });
    }, Le = (t2) => !(!xe(t2) || 0 === t2.getClientRects().length) && "visible" === getComputedStyle(t2).getPropertyValue("visibility"), Pe = (t2) => !t2 || t2.nodeType !== Node.ELEMENT_NODE || (!!t2.classList.contains("disabled") || (void 0 !== t2.disabled ? t2.disabled : t2.hasAttribute("disabled") && "false" !== t2.getAttribute("disabled"))), Me = (t2) => {
      if (!document.documentElement.attachShadow)
        return null;
      if ("function" == typeof t2.getRootNode) {
        const e2 = t2.getRootNode();
        return e2 instanceof ShadowRoot ? e2 : null;
      }
      return t2 instanceof ShadowRoot ? t2 : t2.parentNode ? Me(t2.parentNode) : null;
    }, Ne = () => {
    }, Re = (t2) => {
      t2.offsetHeight;
    }, je = () => {
      const { jQuery: t2 } = window;
      return t2 && !document.body.hasAttribute("data-bs-no-jquery") ? t2 : null;
    }, Ve = [], He = () => "rtl" === document.documentElement.dir, $e = (t2) => {
      ((t3) => {
        "loading" === document.readyState ? (Ve.length || document.addEventListener("DOMContentLoaded", () => {
          Ve.forEach((t4) => t4());
        }), Ve.push(t3)) : t3();
      })(() => {
        const e2 = je();
        if (e2) {
          const n2 = t2.NAME, i2 = e2.fn[n2];
          e2.fn[n2] = t2.jQueryInterface, e2.fn[n2].Constructor = t2, e2.fn[n2].noConflict = () => (e2.fn[n2] = i2, t2.jQueryInterface);
        }
      });
    }, ze = (t2) => {
      "function" == typeof t2 && t2();
    }, We = (t2, e2, n2 = true) => {
      if (!n2)
        return void ze(t2);
      const i2 = ((t3) => {
        if (!t3)
          return 0;
        let { transitionDuration: e3, transitionDelay: n3 } = window.getComputedStyle(t3);
        const i3 = Number.parseFloat(e3), s3 = Number.parseFloat(n3);
        return i3 || s3 ? (e3 = e3.split(",")[0], n3 = n3.split(",")[0], 1e3 * (Number.parseFloat(e3) + Number.parseFloat(n3))) : 0;
      })(e2) + 5;
      let s2 = false;
      const r2 = ({ target: n3 }) => {
        n3 === e2 && (s2 = true, e2.removeEventListener("transitionend", r2), ze(t2));
      };
      e2.addEventListener("transitionend", r2), setTimeout(() => {
        s2 || Fe(e2);
      }, i2);
    }, Ue = (t2, e2, n2, i2) => {
      let s2 = t2.indexOf(e2);
      if (-1 === s2)
        return t2[!n2 && i2 ? t2.length - 1 : 0];
      const r2 = t2.length;
      return s2 += n2 ? 1 : -1, i2 && (s2 = (s2 + r2) % r2), t2[Math.max(0, Math.min(s2, r2 - 1))];
    }, qe = /[^.]*(?=\..*)\.|.*/, Ye = /\..*/, Ke = /::\d+$/, Xe = {};
    let Ge = 1;
    const Qe = { mouseenter: "mouseover", mouseleave: "mouseout" }, Ze = /^(mouseenter|mouseleave)/i, Je = /* @__PURE__ */ new Set(["click", "dblclick", "mouseup", "mousedown", "contextmenu", "mousewheel", "DOMMouseScroll", "mouseover", "mouseout", "mousemove", "selectstart", "selectend", "keydown", "keypress", "keyup", "orientationchange", "touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointermove", "pointerup", "pointerleave", "pointercancel", "gesturestart", "gesturechange", "gestureend", "focus", "blur", "change", "reset", "select", "submit", "focusin", "focusout", "load", "unload", "beforeunload", "resize", "move", "DOMContentLoaded", "readystatechange", "error", "abort", "scroll"]);
    function tn(t2, e2) {
      return e2 && `${e2}::${Ge++}` || t2.uidEvent || Ge++;
    }
    function en(t2) {
      const e2 = tn(t2);
      return t2.uidEvent = e2, Xe[e2] = Xe[e2] || {}, Xe[e2];
    }
    function nn(t2, e2, n2 = null) {
      const i2 = Object.keys(t2);
      for (let s2 = 0, r2 = i2.length; s2 < r2; s2++) {
        const r3 = t2[i2[s2]];
        if (r3.originalHandler === e2 && r3.delegationSelector === n2)
          return r3;
      }
      return null;
    }
    function sn(t2, e2, n2) {
      const i2 = "string" == typeof e2, s2 = i2 ? n2 : e2;
      let r2 = an(t2);
      return Je.has(r2) || (r2 = t2), [i2, s2, r2];
    }
    function rn(t2, e2, n2, i2, s2) {
      if ("string" != typeof e2 || !t2)
        return;
      if (n2 || (n2 = i2, i2 = null), Ze.test(e2)) {
        const t3 = (t4) => function(e3) {
          if (!e3.relatedTarget || e3.relatedTarget !== e3.delegateTarget && !e3.delegateTarget.contains(e3.relatedTarget))
            return t4.call(this, e3);
        };
        i2 ? i2 = t3(i2) : n2 = t3(n2);
      }
      const [r2, o2, a2] = sn(e2, n2, i2), u2 = en(t2), l2 = u2[a2] || (u2[a2] = {}), c2 = nn(l2, o2, r2 ? n2 : null);
      if (c2)
        return void (c2.oneOff = c2.oneOff && s2);
      const h2 = tn(o2, e2.replace(qe, "")), d2 = r2 ? function(t3, e3, n3) {
        return function i3(s3) {
          const r3 = t3.querySelectorAll(e3);
          for (let { target: o3 } = s3; o3 && o3 !== this; o3 = o3.parentNode)
            for (let a3 = r3.length; a3--; )
              if (r3[a3] === o3)
                return s3.delegateTarget = o3, i3.oneOff && un.off(t3, s3.type, e3, n3), n3.apply(o3, [s3]);
          return null;
        };
      }(t2, n2, i2) : function(t3, e3) {
        return function n3(i3) {
          return i3.delegateTarget = t3, n3.oneOff && un.off(t3, i3.type, e3), e3.apply(t3, [i3]);
        };
      }(t2, n2);
      d2.delegationSelector = r2 ? n2 : null, d2.originalHandler = o2, d2.oneOff = s2, d2.uidEvent = h2, l2[h2] = d2, t2.addEventListener(a2, d2, r2);
    }
    function on(t2, e2, n2, i2, s2) {
      const r2 = nn(e2[n2], i2, s2);
      r2 && (t2.removeEventListener(n2, r2, Boolean(s2)), delete e2[n2][r2.uidEvent]);
    }
    function an(t2) {
      return t2 = t2.replace(Ye, ""), Qe[t2] || t2;
    }
    const un = { on(t2, e2, n2, i2) {
      rn(t2, e2, n2, i2, false);
    }, one(t2, e2, n2, i2) {
      rn(t2, e2, n2, i2, true);
    }, off(t2, e2, n2, i2) {
      if ("string" != typeof e2 || !t2)
        return;
      const [s2, r2, o2] = sn(e2, n2, i2), a2 = o2 !== e2, u2 = en(t2), l2 = e2.startsWith(".");
      if (void 0 !== r2) {
        if (!u2 || !u2[o2])
          return;
        return void on(t2, u2, o2, r2, s2 ? n2 : null);
      }
      l2 && Object.keys(u2).forEach((n3) => {
        !function(t3, e3, n4, i3) {
          const s3 = e3[n4] || {};
          Object.keys(s3).forEach((r3) => {
            if (r3.includes(i3)) {
              const i4 = s3[r3];
              on(t3, e3, n4, i4.originalHandler, i4.delegationSelector);
            }
          });
        }(t2, u2, n3, e2.slice(1));
      });
      const c2 = u2[o2] || {};
      Object.keys(c2).forEach((n3) => {
        const i3 = n3.replace(Ke, "");
        if (!a2 || e2.includes(i3)) {
          const e3 = c2[n3];
          on(t2, u2, o2, e3.originalHandler, e3.delegationSelector);
        }
      });
    }, trigger(t2, e2, n2) {
      if ("string" != typeof e2 || !t2)
        return null;
      const i2 = je(), s2 = an(e2), r2 = e2 !== s2, o2 = Je.has(s2);
      let a2, u2 = true, l2 = true, c2 = false, h2 = null;
      return r2 && i2 && (a2 = i2.Event(e2, n2), i2(t2).trigger(a2), u2 = !a2.isPropagationStopped(), l2 = !a2.isImmediatePropagationStopped(), c2 = a2.isDefaultPrevented()), o2 ? (h2 = document.createEvent("HTMLEvents")).initEvent(s2, u2, true) : h2 = new CustomEvent(e2, { bubbles: u2, cancelable: true }), void 0 !== n2 && Object.keys(n2).forEach((t3) => {
        Object.defineProperty(h2, t3, { get: () => n2[t3] });
      }), c2 && h2.preventDefault(), l2 && t2.dispatchEvent(h2), h2.defaultPrevented && void 0 !== a2 && a2.preventDefault(), h2;
    } }, ln = /* @__PURE__ */ new Map(), cn = { set(t2, e2, n2) {
      ln.has(t2) || ln.set(t2, /* @__PURE__ */ new Map());
      const i2 = ln.get(t2);
      i2.has(e2) || 0 === i2.size ? i2.set(e2, n2) : console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(i2.keys())[0]}.`);
    }, get: (t2, e2) => ln.has(t2) && ln.get(t2).get(e2) || null, remove(t2, e2) {
      if (!ln.has(t2))
        return;
      const n2 = ln.get(t2);
      n2.delete(e2), 0 === n2.size && ln.delete(t2);
    } }, hn = "5.1.3";
    class dn {
      constructor(t2) {
        (t2 = Be(t2)) && (this._element = t2, cn.set(this._element, this.constructor.DATA_KEY, this));
      }
      dispose() {
        cn.remove(this._element, this.constructor.DATA_KEY), un.off(this._element, this.constructor.EVENT_KEY), Object.getOwnPropertyNames(this).forEach((t2) => {
          this[t2] = null;
        });
      }
      _queueCallback(t2, e2, n2 = true) {
        We(t2, e2, n2);
      }
      static getInstance(t2) {
        return cn.get(Be(t2), this.DATA_KEY);
      }
      static getOrCreateInstance(t2, e2 = {}) {
        return this.getInstance(t2) || new this(t2, "object" == typeof e2 ? e2 : null);
      }
      static get VERSION() {
        return hn;
      }
      static get NAME() {
        throw new Error('You have to implement the static method "NAME", for each component!');
      }
      static get DATA_KEY() {
        return `bs.${this.NAME}`;
      }
      static get EVENT_KEY() {
        return `.${this.DATA_KEY}`;
      }
    }
    const fn = (t2, e2 = "hide") => {
      const n2 = `click.dismiss${t2.EVENT_KEY}`, i2 = t2.NAME;
      un.on(document, n2, `[data-bs-dismiss="${i2}"]`, function(n3) {
        if (["A", "AREA"].includes(this.tagName) && n3.preventDefault(), Pe(this))
          return;
        const s2 = Oe(this) || this.closest(`.${i2}`);
        t2.getOrCreateInstance(s2)[e2]();
      });
    }, pn = "alert", gn = "close.bs.alert", mn = "closed.bs.alert", vn = "fade", _n = "show";
    class yn extends dn {
      static get NAME() {
        return pn;
      }
      close() {
        if (un.trigger(this._element, gn).defaultPrevented)
          return;
        this._element.classList.remove(_n);
        const t2 = this._element.classList.contains(vn);
        this._queueCallback(() => this._destroyElement(), this._element, t2);
      }
      _destroyElement() {
        this._element.remove(), un.trigger(this._element, mn), this.dispose();
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = yn.getOrCreateInstance(this);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2] || t2.startsWith("_") || "constructor" === t2)
              throw new TypeError(`No method named "${t2}"`);
            e2[t2](this);
          }
        });
      }
    }
    fn(yn, "close"), $e(yn);
    const bn = "button", kn = "active";
    class En extends dn {
      static get NAME() {
        return bn;
      }
      toggle() {
        this._element.setAttribute("aria-pressed", this._element.classList.toggle(kn));
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = En.getOrCreateInstance(this);
          "toggle" === t2 && e2[t2]();
        });
      }
    }
    function wn(t2) {
      return "true" === t2 || "false" !== t2 && (t2 === Number(t2).toString() ? Number(t2) : "" === t2 || "null" === t2 ? null : t2);
    }
    function An(t2) {
      return t2.replace(/[A-Z]/g, (t3) => `-${t3.toLowerCase()}`);
    }
    un.on(document, "click.bs.button.data-api", '[data-bs-toggle="button"]', (t2) => {
      t2.preventDefault();
      const e2 = t2.target.closest('[data-bs-toggle="button"]');
      En.getOrCreateInstance(e2).toggle();
    }), $e(En);
    const Cn = { setDataAttribute(t2, e2, n2) {
      t2.setAttribute(`data-bs-${An(e2)}`, n2);
    }, removeDataAttribute(t2, e2) {
      t2.removeAttribute(`data-bs-${An(e2)}`);
    }, getDataAttributes(t2) {
      if (!t2)
        return {};
      const e2 = {};
      return Object.keys(t2.dataset).filter((t3) => t3.startsWith("bs")).forEach((n2) => {
        let i2 = n2.replace(/^bs/, "");
        i2 = i2.charAt(0).toLowerCase() + i2.slice(1, i2.length), e2[i2] = wn(t2.dataset[n2]);
      }), e2;
    }, getDataAttribute: (t2, e2) => wn(t2.getAttribute(`data-bs-${An(e2)}`)), offset(t2) {
      const e2 = t2.getBoundingClientRect();
      return { top: e2.top + window.pageYOffset, left: e2.left + window.pageXOffset };
    }, position: (t2) => ({ top: t2.offsetTop, left: t2.offsetLeft }) }, Sn = { find: (t2, e2 = document.documentElement) => [].concat(...Element.prototype.querySelectorAll.call(e2, t2)), findOne: (t2, e2 = document.documentElement) => Element.prototype.querySelector.call(e2, t2), children: (t2, e2) => [].concat(...t2.children).filter((t3) => t3.matches(e2)), parents(t2, e2) {
      const n2 = [];
      let i2 = t2.parentNode;
      for (; i2 && i2.nodeType === Node.ELEMENT_NODE && 3 !== i2.nodeType; )
        i2.matches(e2) && n2.push(i2), i2 = i2.parentNode;
      return n2;
    }, prev(t2, e2) {
      let n2 = t2.previousElementSibling;
      for (; n2; ) {
        if (n2.matches(e2))
          return [n2];
        n2 = n2.previousElementSibling;
      }
      return [];
    }, next(t2, e2) {
      let n2 = t2.nextElementSibling;
      for (; n2; ) {
        if (n2.matches(e2))
          return [n2];
        n2 = n2.nextElementSibling;
      }
      return [];
    }, focusableChildren(t2) {
      const e2 = ["a", "button", "input", "textarea", "select", "details", "[tabindex]", '[contenteditable="true"]'].map((t3) => `${t3}:not([tabindex^="-"])`).join(", ");
      return this.find(e2, t2).filter((t3) => !Pe(t3) && Le(t3));
    } }, Tn = "carousel", Dn = 500, On = 40, Fn = { interval: 5e3, keyboard: true, slide: false, pause: "hover", wrap: true, touch: true }, xn = { interval: "(number|boolean)", keyboard: "boolean", slide: "(boolean|string)", pause: "(string|boolean)", wrap: "boolean", touch: "boolean" }, Bn = "next", In = "prev", Ln = "left", Pn = "right", Mn = { ArrowLeft: Pn, ArrowRight: Ln }, Nn = "slide.bs.carousel", Rn = "slid.bs.carousel", jn = "keydown.bs.carousel", Vn = "mouseenter.bs.carousel", Hn = "mouseleave.bs.carousel", $n = "touchstart.bs.carousel", zn = "touchmove.bs.carousel", Wn = "touchend.bs.carousel", Un = "pointerdown.bs.carousel", qn = "pointerup.bs.carousel", Yn = "dragstart.bs.carousel", Kn = "carousel", Xn = "active", Gn = "slide", Qn = "carousel-item-end", Zn = "carousel-item-start", Jn = "carousel-item-next", ti = "carousel-item-prev", ei = "pointer-event", ni = ".active", ii = ".active.carousel-item", si = ".carousel-item", ri = ".carousel-item img", oi = ".carousel-item-next, .carousel-item-prev", ai = ".carousel-indicators", ui = "[data-bs-target]", li = "touch", ci = "pen";
    class hi extends dn {
      constructor(t2, e2) {
        super(t2), this._items = null, this._interval = null, this._activeElement = null, this._isPaused = false, this._isSliding = false, this.touchTimeout = null, this.touchStartX = 0, this.touchDeltaX = 0, this._config = this._getConfig(e2), this._indicatorsElement = Sn.findOne(ai, this._element), this._touchSupported = "ontouchstart" in document.documentElement || navigator.maxTouchPoints > 0, this._pointerEvent = Boolean(window.PointerEvent), this._addEventListeners();
      }
      static get Default() {
        return Fn;
      }
      static get NAME() {
        return Tn;
      }
      next() {
        this._slide(Bn);
      }
      nextWhenVisible() {
        !document.hidden && Le(this._element) && this.next();
      }
      prev() {
        this._slide(In);
      }
      pause(t2) {
        t2 || (this._isPaused = true), Sn.findOne(oi, this._element) && (Fe(this._element), this.cycle(true)), clearInterval(this._interval), this._interval = null;
      }
      cycle(t2) {
        t2 || (this._isPaused = false), this._interval && (clearInterval(this._interval), this._interval = null), this._config && this._config.interval && !this._isPaused && (this._updateInterval(), this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval));
      }
      to(t2) {
        this._activeElement = Sn.findOne(ii, this._element);
        const e2 = this._getItemIndex(this._activeElement);
        if (t2 > this._items.length - 1 || t2 < 0)
          return;
        if (this._isSliding)
          return void un.one(this._element, Rn, () => this.to(t2));
        if (e2 === t2)
          return this.pause(), void this.cycle();
        const n2 = t2 > e2 ? Bn : In;
        this._slide(n2, this._items[t2]);
      }
      _getConfig(t2) {
        return t2 = { ...Fn, ...Cn.getDataAttributes(this._element), ..."object" == typeof t2 ? t2 : {} }, Ie(Tn, t2, xn), t2;
      }
      _handleSwipe() {
        const t2 = Math.abs(this.touchDeltaX);
        if (t2 <= On)
          return;
        const e2 = t2 / this.touchDeltaX;
        this.touchDeltaX = 0, e2 && this._slide(e2 > 0 ? Pn : Ln);
      }
      _addEventListeners() {
        this._config.keyboard && un.on(this._element, jn, (t2) => this._keydown(t2)), "hover" === this._config.pause && (un.on(this._element, Vn, (t2) => this.pause(t2)), un.on(this._element, Hn, (t2) => this.cycle(t2))), this._config.touch && this._touchSupported && this._addTouchEventListeners();
      }
      _addTouchEventListeners() {
        const t2 = (t3) => this._pointerEvent && (t3.pointerType === ci || t3.pointerType === li), e2 = (e3) => {
          t2(e3) ? this.touchStartX = e3.clientX : this._pointerEvent || (this.touchStartX = e3.touches[0].clientX);
        }, n2 = (t3) => {
          this.touchDeltaX = t3.touches && t3.touches.length > 1 ? 0 : t3.touches[0].clientX - this.touchStartX;
        }, i2 = (e3) => {
          t2(e3) && (this.touchDeltaX = e3.clientX - this.touchStartX), this._handleSwipe(), "hover" === this._config.pause && (this.pause(), this.touchTimeout && clearTimeout(this.touchTimeout), this.touchTimeout = setTimeout((t3) => this.cycle(t3), Dn + this._config.interval));
        };
        Sn.find(ri, this._element).forEach((t3) => {
          un.on(t3, Yn, (t4) => t4.preventDefault());
        }), this._pointerEvent ? (un.on(this._element, Un, (t3) => e2(t3)), un.on(this._element, qn, (t3) => i2(t3)), this._element.classList.add(ei)) : (un.on(this._element, $n, (t3) => e2(t3)), un.on(this._element, zn, (t3) => n2(t3)), un.on(this._element, Wn, (t3) => i2(t3)));
      }
      _keydown(t2) {
        if (/input|textarea/i.test(t2.target.tagName))
          return;
        const e2 = Mn[t2.key];
        e2 && (t2.preventDefault(), this._slide(e2));
      }
      _getItemIndex(t2) {
        return this._items = t2 && t2.parentNode ? Sn.find(si, t2.parentNode) : [], this._items.indexOf(t2);
      }
      _getItemByOrder(t2, e2) {
        const n2 = t2 === Bn;
        return Ue(this._items, e2, n2, this._config.wrap);
      }
      _triggerSlideEvent(t2, e2) {
        const n2 = this._getItemIndex(t2), i2 = this._getItemIndex(Sn.findOne(ii, this._element));
        return un.trigger(this._element, Nn, { relatedTarget: t2, direction: e2, from: i2, to: n2 });
      }
      _setActiveIndicatorElement(t2) {
        if (this._indicatorsElement) {
          const e2 = Sn.findOne(ni, this._indicatorsElement);
          e2.classList.remove(Xn), e2.removeAttribute("aria-current");
          const n2 = Sn.find(ui, this._indicatorsElement);
          for (let e3 = 0; e3 < n2.length; e3++)
            if (Number.parseInt(n2[e3].getAttribute("data-bs-slide-to"), 10) === this._getItemIndex(t2)) {
              n2[e3].classList.add(Xn), n2[e3].setAttribute("aria-current", "true");
              break;
            }
        }
      }
      _updateInterval() {
        const t2 = this._activeElement || Sn.findOne(ii, this._element);
        if (!t2)
          return;
        const e2 = Number.parseInt(t2.getAttribute("data-bs-interval"), 10);
        e2 ? (this._config.defaultInterval = this._config.defaultInterval || this._config.interval, this._config.interval = e2) : this._config.interval = this._config.defaultInterval || this._config.interval;
      }
      _slide(t2, e2) {
        const n2 = this._directionToOrder(t2), i2 = Sn.findOne(ii, this._element), s2 = this._getItemIndex(i2), r2 = e2 || this._getItemByOrder(n2, i2), o2 = this._getItemIndex(r2), a2 = Boolean(this._interval), u2 = n2 === Bn, l2 = u2 ? Zn : Qn, c2 = u2 ? Jn : ti, h2 = this._orderToDirection(n2);
        if (r2 && r2.classList.contains(Xn))
          return void (this._isSliding = false);
        if (this._isSliding)
          return;
        if (this._triggerSlideEvent(r2, h2).defaultPrevented)
          return;
        if (!i2 || !r2)
          return;
        this._isSliding = true, a2 && this.pause(), this._setActiveIndicatorElement(r2), this._activeElement = r2;
        const d2 = () => {
          un.trigger(this._element, Rn, { relatedTarget: r2, direction: h2, from: s2, to: o2 });
        };
        if (this._element.classList.contains(Gn)) {
          r2.classList.add(c2), Re(r2), i2.classList.add(l2), r2.classList.add(l2);
          const t3 = () => {
            r2.classList.remove(l2, c2), r2.classList.add(Xn), i2.classList.remove(Xn, c2, l2), this._isSliding = false, setTimeout(d2, 0);
          };
          this._queueCallback(t3, i2, true);
        } else
          i2.classList.remove(Xn), r2.classList.add(Xn), this._isSliding = false, d2();
        a2 && this.cycle();
      }
      _directionToOrder(t2) {
        return [Pn, Ln].includes(t2) ? He() ? t2 === Ln ? In : Bn : t2 === Ln ? Bn : In : t2;
      }
      _orderToDirection(t2) {
        return [Bn, In].includes(t2) ? He() ? t2 === In ? Ln : Pn : t2 === In ? Pn : Ln : t2;
      }
      static carouselInterface(t2, e2) {
        const n2 = hi.getOrCreateInstance(t2, e2);
        let { _config: i2 } = n2;
        "object" == typeof e2 && (i2 = { ...i2, ...e2 });
        const s2 = "string" == typeof e2 ? e2 : i2.slide;
        if ("number" == typeof e2)
          n2.to(e2);
        else if ("string" == typeof s2) {
          if (void 0 === n2[s2])
            throw new TypeError(`No method named "${s2}"`);
          n2[s2]();
        } else
          i2.interval && i2.ride && (n2.pause(), n2.cycle());
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          hi.carouselInterface(this, t2);
        });
      }
      static dataApiClickHandler(t2) {
        const e2 = Oe(this);
        if (!e2 || !e2.classList.contains(Kn))
          return;
        const n2 = { ...Cn.getDataAttributes(e2), ...Cn.getDataAttributes(this) }, i2 = this.getAttribute("data-bs-slide-to");
        i2 && (n2.interval = false), hi.carouselInterface(e2, n2), i2 && hi.getInstance(e2).to(i2), t2.preventDefault();
      }
    }
    un.on(document, "click.bs.carousel.data-api", "[data-bs-slide], [data-bs-slide-to]", hi.dataApiClickHandler), un.on(window, "load.bs.carousel.data-api", () => {
      const t2 = Sn.find('[data-bs-ride="carousel"]');
      for (let e2 = 0, n2 = t2.length; e2 < n2; e2++)
        hi.carouselInterface(t2[e2], hi.getInstance(t2[e2]));
    }), $e(hi);
    const di = "collapse", fi = "bs.collapse", pi = `.${fi}`, gi = { toggle: true, parent: null }, mi = { toggle: "boolean", parent: "(null|element)" }, vi = `show${pi}`, _i = `shown${pi}`, yi = `hide${pi}`, bi = `hidden${pi}`, ki = `click${pi}.data-api`, Ei = "show", wi = "collapse", Ai = "collapsing", Ci = "collapsed", Si = `:scope .${wi} .${wi}`, Ti = "collapse-horizontal", Di = "width", Oi = "height", Fi = ".collapse.show, .collapse.collapsing", xi = '[data-bs-toggle="collapse"]';
    class Bi extends dn {
      constructor(t2, e2) {
        super(t2), this._isTransitioning = false, this._config = this._getConfig(e2), this._triggerArray = [];
        const n2 = Sn.find(xi);
        for (let t3 = 0, e3 = n2.length; t3 < e3; t3++) {
          const e4 = n2[t3], i2 = De(e4), s2 = Sn.find(i2).filter((t4) => t4 === this._element);
          null !== i2 && s2.length && (this._selector = i2, this._triggerArray.push(e4));
        }
        this._initializeChildren(), this._config.parent || this._addAriaAndCollapsedClass(this._triggerArray, this._isShown()), this._config.toggle && this.toggle();
      }
      static get Default() {
        return gi;
      }
      static get NAME() {
        return di;
      }
      toggle() {
        this._isShown() ? this.hide() : this.show();
      }
      show() {
        if (this._isTransitioning || this._isShown())
          return;
        let t2, e2 = [];
        if (this._config.parent) {
          const t3 = Sn.find(Si, this._config.parent);
          e2 = Sn.find(Fi, this._config.parent).filter((e3) => !t3.includes(e3));
        }
        const n2 = Sn.findOne(this._selector);
        if (e2.length) {
          const i3 = e2.find((t3) => n2 !== t3);
          if ((t2 = i3 ? Bi.getInstance(i3) : null) && t2._isTransitioning)
            return;
        }
        if (un.trigger(this._element, vi).defaultPrevented)
          return;
        e2.forEach((e3) => {
          n2 !== e3 && Bi.getOrCreateInstance(e3, { toggle: false }).hide(), t2 || cn.set(e3, fi, null);
        });
        const i2 = this._getDimension();
        this._element.classList.remove(wi), this._element.classList.add(Ai), this._element.style[i2] = 0, this._addAriaAndCollapsedClass(this._triggerArray, true), this._isTransitioning = true;
        const s2 = `scroll${i2[0].toUpperCase() + i2.slice(1)}`;
        this._queueCallback(() => {
          this._isTransitioning = false, this._element.classList.remove(Ai), this._element.classList.add(wi, Ei), this._element.style[i2] = "", un.trigger(this._element, _i);
        }, this._element, true), this._element.style[i2] = `${this._element[s2]}px`;
      }
      hide() {
        if (this._isTransitioning || !this._isShown())
          return;
        if (un.trigger(this._element, yi).defaultPrevented)
          return;
        const t2 = this._getDimension();
        this._element.style[t2] = `${this._element.getBoundingClientRect()[t2]}px`, Re(this._element), this._element.classList.add(Ai), this._element.classList.remove(wi, Ei);
        const e2 = this._triggerArray.length;
        for (let t3 = 0; t3 < e2; t3++) {
          const e3 = this._triggerArray[t3], n2 = Oe(e3);
          n2 && !this._isShown(n2) && this._addAriaAndCollapsedClass([e3], false);
        }
        this._isTransitioning = true;
        this._element.style[t2] = "", this._queueCallback(() => {
          this._isTransitioning = false, this._element.classList.remove(Ai), this._element.classList.add(wi), un.trigger(this._element, bi);
        }, this._element, true);
      }
      _isShown(t2 = this._element) {
        return t2.classList.contains(Ei);
      }
      _getConfig(t2) {
        return (t2 = { ...gi, ...Cn.getDataAttributes(this._element), ...t2 }).toggle = Boolean(t2.toggle), t2.parent = Be(t2.parent), Ie(di, t2, mi), t2;
      }
      _getDimension() {
        return this._element.classList.contains(Ti) ? Di : Oi;
      }
      _initializeChildren() {
        if (!this._config.parent)
          return;
        const t2 = Sn.find(Si, this._config.parent);
        Sn.find(xi, this._config.parent).filter((e2) => !t2.includes(e2)).forEach((t3) => {
          const e2 = Oe(t3);
          e2 && this._addAriaAndCollapsedClass([t3], this._isShown(e2));
        });
      }
      _addAriaAndCollapsedClass(t2, e2) {
        t2.length && t2.forEach((t3) => {
          e2 ? t3.classList.remove(Ci) : t3.classList.add(Ci), t3.setAttribute("aria-expanded", e2);
        });
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = {};
          "string" == typeof t2 && /show|hide/.test(t2) && (e2.toggle = false);
          const n2 = Bi.getOrCreateInstance(this, e2);
          if ("string" == typeof t2) {
            if (void 0 === n2[t2])
              throw new TypeError(`No method named "${t2}"`);
            n2[t2]();
          }
        });
      }
    }
    un.on(document, ki, xi, function(t2) {
      ("A" === t2.target.tagName || t2.delegateTarget && "A" === t2.delegateTarget.tagName) && t2.preventDefault();
      const e2 = De(this);
      Sn.find(e2).forEach((t3) => {
        Bi.getOrCreateInstance(t3, { toggle: false }).toggle();
      });
    }), $e(Bi);
    const Ii = "dropdown", Li = "Escape", Pi = "Space", Mi = "Tab", Ni = "ArrowUp", Ri = "ArrowDown", ji = 2, Vi = new RegExp(`${Ni}|${Ri}|${Li}`), Hi = "hide.bs.dropdown", $i = "hidden.bs.dropdown", zi = "show.bs.dropdown", Wi = "shown.bs.dropdown", Ui = "show", qi = "dropup", Yi = "dropend", Ki = "dropstart", Xi = "navbar", Gi = '[data-bs-toggle="dropdown"]', Qi = ".dropdown-menu", Zi = ".navbar-nav", Ji = ".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)", ts = He() ? "top-end" : "top-start", es = He() ? "top-start" : "top-end", ns = He() ? "bottom-end" : "bottom-start", is = He() ? "bottom-start" : "bottom-end", ss = He() ? "left-start" : "right-start", rs = He() ? "right-start" : "left-start", os = { offset: [0, 2], boundary: "clippingParents", reference: "toggle", display: "dynamic", popperConfig: null, autoClose: true }, as = { offset: "(array|string|function)", boundary: "(string|element)", reference: "(string|element|object)", display: "string", popperConfig: "(null|object|function)", autoClose: "(boolean|string)" };
    class us extends dn {
      constructor(t2, e2) {
        super(t2), this._popper = null, this._config = this._getConfig(e2), this._menu = this._getMenuElement(), this._inNavbar = this._detectNavbar();
      }
      static get Default() {
        return os;
      }
      static get DefaultType() {
        return as;
      }
      static get NAME() {
        return Ii;
      }
      toggle() {
        return this._isShown() ? this.hide() : this.show();
      }
      show() {
        if (Pe(this._element) || this._isShown(this._menu))
          return;
        const t2 = { relatedTarget: this._element };
        if (un.trigger(this._element, zi, t2).defaultPrevented)
          return;
        const e2 = us.getParentFromElement(this._element);
        this._inNavbar ? Cn.setDataAttribute(this._menu, "popper", "none") : this._createPopper(e2), "ontouchstart" in document.documentElement && !e2.closest(Zi) && [].concat(...document.body.children).forEach((t3) => un.on(t3, "mouseover", Ne)), this._element.focus(), this._element.setAttribute("aria-expanded", true), this._menu.classList.add(Ui), this._element.classList.add(Ui), un.trigger(this._element, Wi, t2);
      }
      hide() {
        if (Pe(this._element) || !this._isShown(this._menu))
          return;
        const t2 = { relatedTarget: this._element };
        this._completeHide(t2);
      }
      dispose() {
        this._popper && this._popper.destroy(), super.dispose();
      }
      update() {
        this._inNavbar = this._detectNavbar(), this._popper && this._popper.update();
      }
      _completeHide(t2) {
        un.trigger(this._element, Hi, t2).defaultPrevented || ("ontouchstart" in document.documentElement && [].concat(...document.body.children).forEach((t3) => un.off(t3, "mouseover", Ne)), this._popper && this._popper.destroy(), this._menu.classList.remove(Ui), this._element.classList.remove(Ui), this._element.setAttribute("aria-expanded", "false"), Cn.removeDataAttribute(this._menu, "popper"), un.trigger(this._element, $i, t2));
      }
      _getConfig(t2) {
        if (t2 = { ...this.constructor.Default, ...Cn.getDataAttributes(this._element), ...t2 }, Ie(Ii, t2, this.constructor.DefaultType), "object" == typeof t2.reference && !xe(t2.reference) && "function" != typeof t2.reference.getBoundingClientRect)
          throw new TypeError(`${Ii.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);
        return t2;
      }
      _createPopper(t2) {
        if (void 0 === Ce)
          throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org)");
        let e2 = this._element;
        "parent" === this._config.reference ? e2 = t2 : xe(this._config.reference) ? e2 = Be(this._config.reference) : "object" == typeof this._config.reference && (e2 = this._config.reference);
        const n2 = this._getPopperConfig(), i2 = n2.modifiers.find((t3) => "applyStyles" === t3.name && false === t3.enabled);
        this._popper = Ae(e2, this._menu, n2), i2 && Cn.setDataAttribute(this._menu, "popper", "static");
      }
      _isShown(t2 = this._element) {
        return t2.classList.contains(Ui);
      }
      _getMenuElement() {
        return Sn.next(this._element, Qi)[0];
      }
      _getPlacement() {
        const t2 = this._element.parentNode;
        if (t2.classList.contains(Yi))
          return ss;
        if (t2.classList.contains(Ki))
          return rs;
        const e2 = "end" === getComputedStyle(this._menu).getPropertyValue("--bs-position").trim();
        return t2.classList.contains(qi) ? e2 ? es : ts : e2 ? is : ns;
      }
      _detectNavbar() {
        return null !== this._element.closest(`.${Xi}`);
      }
      _getOffset() {
        const { offset: t2 } = this._config;
        return "string" == typeof t2 ? t2.split(",").map((t3) => Number.parseInt(t3, 10)) : "function" == typeof t2 ? (e2) => t2(e2, this._element) : t2;
      }
      _getPopperConfig() {
        const t2 = { placement: this._getPlacement(), modifiers: [{ name: "preventOverflow", options: { boundary: this._config.boundary } }, { name: "offset", options: { offset: this._getOffset() } }] };
        return "static" === this._config.display && (t2.modifiers = [{ name: "applyStyles", enabled: false }]), { ...t2, ..."function" == typeof this._config.popperConfig ? this._config.popperConfig(t2) : this._config.popperConfig };
      }
      _selectMenuItem({ key: t2, target: e2 }) {
        const n2 = Sn.find(Ji, this._menu).filter(Le);
        n2.length && Ue(n2, e2, t2 === Ri, !n2.includes(e2)).focus();
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = us.getOrCreateInstance(this, t2);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2])
              throw new TypeError(`No method named "${t2}"`);
            e2[t2]();
          }
        });
      }
      static clearMenus(t2) {
        if (t2 && (t2.button === ji || "keyup" === t2.type && t2.key !== Mi))
          return;
        const e2 = Sn.find(Gi);
        for (let n2 = 0, i2 = e2.length; n2 < i2; n2++) {
          const i3 = us.getInstance(e2[n2]);
          if (!i3 || false === i3._config.autoClose)
            continue;
          if (!i3._isShown())
            continue;
          const s2 = { relatedTarget: i3._element };
          if (t2) {
            const e3 = t2.composedPath(), n3 = e3.includes(i3._menu);
            if (e3.includes(i3._element) || "inside" === i3._config.autoClose && !n3 || "outside" === i3._config.autoClose && n3)
              continue;
            if (i3._menu.contains(t2.target) && ("keyup" === t2.type && t2.key === Mi || /input|select|option|textarea|form/i.test(t2.target.tagName)))
              continue;
            "click" === t2.type && (s2.clickEvent = t2);
          }
          i3._completeHide(s2);
        }
      }
      static getParentFromElement(t2) {
        return Oe(t2) || t2.parentNode;
      }
      static dataApiKeydownHandler(t2) {
        if (/input|textarea/i.test(t2.target.tagName) ? t2.key === Pi || t2.key !== Li && (t2.key !== Ri && t2.key !== Ni || t2.target.closest(Qi)) : !Vi.test(t2.key))
          return;
        const e2 = this.classList.contains(Ui);
        if (!e2 && t2.key === Li)
          return;
        if (t2.preventDefault(), t2.stopPropagation(), Pe(this))
          return;
        const n2 = this.matches(Gi) ? this : Sn.prev(this, Gi)[0], i2 = us.getOrCreateInstance(n2);
        if (t2.key !== Li)
          return t2.key === Ni || t2.key === Ri ? (e2 || i2.show(), void i2._selectMenuItem(t2)) : void (e2 && t2.key !== Pi || us.clearMenus());
        i2.hide();
      }
    }
    un.on(document, "keydown.bs.dropdown.data-api", Gi, us.dataApiKeydownHandler), un.on(document, "keydown.bs.dropdown.data-api", Qi, us.dataApiKeydownHandler), un.on(document, "click.bs.dropdown.data-api", us.clearMenus), un.on(document, "keyup.bs.dropdown.data-api", us.clearMenus), un.on(document, "click.bs.dropdown.data-api", Gi, function(t2) {
      t2.preventDefault(), us.getOrCreateInstance(this).toggle();
    }), $e(us);
    const ls = ".fixed-top, .fixed-bottom, .is-fixed, .sticky-top", cs = ".sticky-top";
    class hs {
      constructor() {
        this._element = document.body;
      }
      getWidth() {
        const t2 = document.documentElement.clientWidth;
        return Math.abs(window.innerWidth - t2);
      }
      hide() {
        const t2 = this.getWidth();
        this._disableOverFlow(), this._setElementAttributes(this._element, "paddingRight", (e2) => e2 + t2), this._setElementAttributes(ls, "paddingRight", (e2) => e2 + t2), this._setElementAttributes(cs, "marginRight", (e2) => e2 - t2);
      }
      _disableOverFlow() {
        this._saveInitialAttribute(this._element, "overflow"), this._element.style.overflow = "hidden";
      }
      _setElementAttributes(t2, e2, n2) {
        const i2 = this.getWidth();
        this._applyManipulationCallback(t2, (t3) => {
          if (t3 !== this._element && window.innerWidth > t3.clientWidth + i2)
            return;
          this._saveInitialAttribute(t3, e2);
          const s2 = window.getComputedStyle(t3)[e2];
          t3.style[e2] = `${n2(Number.parseFloat(s2))}px`;
        });
      }
      reset() {
        this._resetElementAttributes(this._element, "overflow"), this._resetElementAttributes(this._element, "paddingRight"), this._resetElementAttributes(ls, "paddingRight"), this._resetElementAttributes(cs, "marginRight");
      }
      _saveInitialAttribute(t2, e2) {
        const n2 = t2.style[e2];
        n2 && Cn.setDataAttribute(t2, e2, n2);
      }
      _resetElementAttributes(t2, e2) {
        this._applyManipulationCallback(t2, (t3) => {
          const n2 = Cn.getDataAttribute(t3, e2);
          void 0 === n2 ? t3.style.removeProperty(e2) : (Cn.removeDataAttribute(t3, e2), t3.style[e2] = n2);
        });
      }
      _applyManipulationCallback(t2, e2) {
        xe(t2) ? e2(t2) : Sn.find(t2, this._element).forEach(e2);
      }
      isOverflowing() {
        return this.getWidth() > 0;
      }
    }
    const ds = { className: "modal-backdrop", isVisible: true, isAnimated: false, rootElement: "body", clickCallback: null }, fs = { className: "string", isVisible: "boolean", isAnimated: "boolean", rootElement: "(element|string)", clickCallback: "(function|null)" }, ps = "backdrop", gs = "fade", ms = "show", vs = `mousedown.bs.${ps}`;
    class _s {
      constructor(t2) {
        this._config = this._getConfig(t2), this._isAppended = false, this._element = null;
      }
      show(t2) {
        this._config.isVisible ? (this._append(), this._config.isAnimated && Re(this._getElement()), this._getElement().classList.add(ms), this._emulateAnimation(() => {
          ze(t2);
        })) : ze(t2);
      }
      hide(t2) {
        this._config.isVisible ? (this._getElement().classList.remove(ms), this._emulateAnimation(() => {
          this.dispose(), ze(t2);
        })) : ze(t2);
      }
      _getElement() {
        if (!this._element) {
          const t2 = document.createElement("div");
          t2.className = this._config.className, this._config.isAnimated && t2.classList.add(gs), this._element = t2;
        }
        return this._element;
      }
      _getConfig(t2) {
        return (t2 = { ...ds, ..."object" == typeof t2 ? t2 : {} }).rootElement = Be(t2.rootElement), Ie(ps, t2, fs), t2;
      }
      _append() {
        this._isAppended || (this._config.rootElement.append(this._getElement()), un.on(this._getElement(), vs, () => {
          ze(this._config.clickCallback);
        }), this._isAppended = true);
      }
      dispose() {
        this._isAppended && (un.off(this._element, vs), this._element.remove(), this._isAppended = false);
      }
      _emulateAnimation(t2) {
        We(t2, this._getElement(), this._config.isAnimated);
      }
    }
    const ys = { trapElement: null, autofocus: true }, bs = { trapElement: "element", autofocus: "boolean" }, ks = "focustrap", Es = ".bs.focustrap", ws = `focusin${Es}`, As = `keydown.tab${Es}`, Cs = "Tab", Ss = "forward", Ts = "backward";
    class Ds {
      constructor(t2) {
        this._config = this._getConfig(t2), this._isActive = false, this._lastTabNavDirection = null;
      }
      activate() {
        const { trapElement: t2, autofocus: e2 } = this._config;
        this._isActive || (e2 && t2.focus(), un.off(document, Es), un.on(document, ws, (t3) => this._handleFocusin(t3)), un.on(document, As, (t3) => this._handleKeydown(t3)), this._isActive = true);
      }
      deactivate() {
        this._isActive && (this._isActive = false, un.off(document, Es));
      }
      _handleFocusin(t2) {
        const { target: e2 } = t2, { trapElement: n2 } = this._config;
        if (e2 === document || e2 === n2 || n2.contains(e2))
          return;
        const i2 = Sn.focusableChildren(n2);
        0 === i2.length ? n2.focus() : this._lastTabNavDirection === Ts ? i2[i2.length - 1].focus() : i2[0].focus();
      }
      _handleKeydown(t2) {
        t2.key === Cs && (this._lastTabNavDirection = t2.shiftKey ? Ts : Ss);
      }
      _getConfig(t2) {
        return t2 = { ...ys, ..."object" == typeof t2 ? t2 : {} }, Ie(ks, t2, bs), t2;
      }
    }
    const Os = "modal", Fs = ".bs.modal", xs = "Escape", Bs = { backdrop: true, keyboard: true, focus: true }, Is = { backdrop: "(boolean|string)", keyboard: "boolean", focus: "boolean" }, Ls = `hide${Fs}`, Ps = `hidePrevented${Fs}`, Ms = `hidden${Fs}`, Ns = `show${Fs}`, Rs = `shown${Fs}`, js = `resize${Fs}`, Vs = `click.dismiss${Fs}`, Hs = `keydown.dismiss${Fs}`, $s = `mouseup.dismiss${Fs}`, zs = `mousedown.dismiss${Fs}`, Ws = `click${Fs}.data-api`, Us = "modal-open", qs = "fade", Ys = "show", Ks = "modal-static", Xs = ".modal-dialog", Gs = ".modal-body";
    class Qs extends dn {
      constructor(t2, e2) {
        super(t2), this._config = this._getConfig(e2), this._dialog = Sn.findOne(Xs, this._element), this._backdrop = this._initializeBackDrop(), this._focustrap = this._initializeFocusTrap(), this._isShown = false, this._ignoreBackdropClick = false, this._isTransitioning = false, this._scrollBar = new hs();
      }
      static get Default() {
        return Bs;
      }
      static get NAME() {
        return Os;
      }
      toggle(t2) {
        return this._isShown ? this.hide() : this.show(t2);
      }
      show(t2) {
        if (this._isShown || this._isTransitioning)
          return;
        un.trigger(this._element, Ns, { relatedTarget: t2 }).defaultPrevented || (this._isShown = true, this._isAnimated() && (this._isTransitioning = true), this._scrollBar.hide(), document.body.classList.add(Us), this._adjustDialog(), this._setEscapeEvent(), this._setResizeEvent(), un.on(this._dialog, zs, () => {
          un.one(this._element, $s, (t3) => {
            t3.target === this._element && (this._ignoreBackdropClick = true);
          });
        }), this._showBackdrop(() => this._showElement(t2)));
      }
      hide() {
        if (!this._isShown || this._isTransitioning)
          return;
        if (un.trigger(this._element, Ls).defaultPrevented)
          return;
        this._isShown = false;
        const t2 = this._isAnimated();
        t2 && (this._isTransitioning = true), this._setEscapeEvent(), this._setResizeEvent(), this._focustrap.deactivate(), this._element.classList.remove(Ys), un.off(this._element, Vs), un.off(this._dialog, zs), this._queueCallback(() => this._hideModal(), this._element, t2);
      }
      dispose() {
        [window, this._dialog].forEach((t2) => un.off(t2, Fs)), this._backdrop.dispose(), this._focustrap.deactivate(), super.dispose();
      }
      handleUpdate() {
        this._adjustDialog();
      }
      _initializeBackDrop() {
        return new _s({ isVisible: Boolean(this._config.backdrop), isAnimated: this._isAnimated() });
      }
      _initializeFocusTrap() {
        return new Ds({ trapElement: this._element });
      }
      _getConfig(t2) {
        return t2 = { ...Bs, ...Cn.getDataAttributes(this._element), ..."object" == typeof t2 ? t2 : {} }, Ie(Os, t2, Is), t2;
      }
      _showElement(t2) {
        const e2 = this._isAnimated(), n2 = Sn.findOne(Gs, this._dialog);
        this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE || document.body.append(this._element), this._element.style.display = "block", this._element.removeAttribute("aria-hidden"), this._element.setAttribute("aria-modal", true), this._element.setAttribute("role", "dialog"), this._element.scrollTop = 0, n2 && (n2.scrollTop = 0), e2 && Re(this._element), this._element.classList.add(Ys);
        this._queueCallback(() => {
          this._config.focus && this._focustrap.activate(), this._isTransitioning = false, un.trigger(this._element, Rs, { relatedTarget: t2 });
        }, this._dialog, e2);
      }
      _setEscapeEvent() {
        this._isShown ? un.on(this._element, Hs, (t2) => {
          this._config.keyboard && t2.key === xs ? (t2.preventDefault(), this.hide()) : this._config.keyboard || t2.key !== xs || this._triggerBackdropTransition();
        }) : un.off(this._element, Hs);
      }
      _setResizeEvent() {
        this._isShown ? un.on(window, js, () => this._adjustDialog()) : un.off(window, js);
      }
      _hideModal() {
        this._element.style.display = "none", this._element.setAttribute("aria-hidden", true), this._element.removeAttribute("aria-modal"), this._element.removeAttribute("role"), this._isTransitioning = false, this._backdrop.hide(() => {
          document.body.classList.remove(Us), this._resetAdjustments(), this._scrollBar.reset(), un.trigger(this._element, Ms);
        });
      }
      _showBackdrop(t2) {
        un.on(this._element, Vs, (t3) => {
          this._ignoreBackdropClick ? this._ignoreBackdropClick = false : t3.target === t3.currentTarget && (true === this._config.backdrop ? this.hide() : "static" === this._config.backdrop && this._triggerBackdropTransition());
        }), this._backdrop.show(t2);
      }
      _isAnimated() {
        return this._element.classList.contains(qs);
      }
      _triggerBackdropTransition() {
        if (un.trigger(this._element, Ps).defaultPrevented)
          return;
        const { classList: t2, scrollHeight: e2, style: n2 } = this._element, i2 = e2 > document.documentElement.clientHeight;
        !i2 && "hidden" === n2.overflowY || t2.contains(Ks) || (i2 || (n2.overflowY = "hidden"), t2.add(Ks), this._queueCallback(() => {
          t2.remove(Ks), i2 || this._queueCallback(() => {
            n2.overflowY = "";
          }, this._dialog);
        }, this._dialog), this._element.focus());
      }
      _adjustDialog() {
        const t2 = this._element.scrollHeight > document.documentElement.clientHeight, e2 = this._scrollBar.getWidth(), n2 = e2 > 0;
        (!n2 && t2 && !He() || n2 && !t2 && He()) && (this._element.style.paddingLeft = `${e2}px`), (n2 && !t2 && !He() || !n2 && t2 && He()) && (this._element.style.paddingRight = `${e2}px`);
      }
      _resetAdjustments() {
        this._element.style.paddingLeft = "", this._element.style.paddingRight = "";
      }
      static jQueryInterface(t2, e2) {
        return this.each(function() {
          const n2 = Qs.getOrCreateInstance(this, t2);
          if ("string" == typeof t2) {
            if (void 0 === n2[t2])
              throw new TypeError(`No method named "${t2}"`);
            n2[t2](e2);
          }
        });
      }
    }
    un.on(document, Ws, '[data-bs-toggle="modal"]', function(t2) {
      const e2 = Oe(this);
      ["A", "AREA"].includes(this.tagName) && t2.preventDefault(), un.one(e2, Ns, (t3) => {
        t3.defaultPrevented || un.one(e2, Ms, () => {
          Le(this) && this.focus();
        });
      });
      const n2 = Sn.findOne(".modal.show");
      n2 && Qs.getInstance(n2).hide(), Qs.getOrCreateInstance(e2).toggle(this);
    }), fn(Qs), $e(Qs);
    const Zs = "offcanvas", Js = "Escape", tr = { backdrop: true, keyboard: true, scroll: false }, er = { backdrop: "boolean", keyboard: "boolean", scroll: "boolean" }, nr = "show", ir = "offcanvas-backdrop", sr = "show.bs.offcanvas", rr = "shown.bs.offcanvas", or = "hide.bs.offcanvas", ar = "hidden.bs.offcanvas", ur = "keydown.dismiss.bs.offcanvas";
    class lr extends dn {
      constructor(t2, e2) {
        super(t2), this._config = this._getConfig(e2), this._isShown = false, this._backdrop = this._initializeBackDrop(), this._focustrap = this._initializeFocusTrap(), this._addEventListeners();
      }
      static get NAME() {
        return Zs;
      }
      static get Default() {
        return tr;
      }
      toggle(t2) {
        return this._isShown ? this.hide() : this.show(t2);
      }
      show(t2) {
        if (this._isShown)
          return;
        if (un.trigger(this._element, sr, { relatedTarget: t2 }).defaultPrevented)
          return;
        this._isShown = true, this._element.style.visibility = "visible", this._backdrop.show(), this._config.scroll || new hs().hide(), this._element.removeAttribute("aria-hidden"), this._element.setAttribute("aria-modal", true), this._element.setAttribute("role", "dialog"), this._element.classList.add(nr);
        this._queueCallback(() => {
          this._config.scroll || this._focustrap.activate(), un.trigger(this._element, rr, { relatedTarget: t2 });
        }, this._element, true);
      }
      hide() {
        if (!this._isShown)
          return;
        if (un.trigger(this._element, or).defaultPrevented)
          return;
        this._focustrap.deactivate(), this._element.blur(), this._isShown = false, this._element.classList.remove(nr), this._backdrop.hide();
        this._queueCallback(() => {
          this._element.setAttribute("aria-hidden", true), this._element.removeAttribute("aria-modal"), this._element.removeAttribute("role"), this._element.style.visibility = "hidden", this._config.scroll || new hs().reset(), un.trigger(this._element, ar);
        }, this._element, true);
      }
      dispose() {
        this._backdrop.dispose(), this._focustrap.deactivate(), super.dispose();
      }
      _getConfig(t2) {
        return t2 = { ...tr, ...Cn.getDataAttributes(this._element), ..."object" == typeof t2 ? t2 : {} }, Ie(Zs, t2, er), t2;
      }
      _initializeBackDrop() {
        return new _s({ className: ir, isVisible: this._config.backdrop, isAnimated: true, rootElement: this._element.parentNode, clickCallback: () => this.hide() });
      }
      _initializeFocusTrap() {
        return new Ds({ trapElement: this._element });
      }
      _addEventListeners() {
        un.on(this._element, ur, (t2) => {
          this._config.keyboard && t2.key === Js && this.hide();
        });
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = lr.getOrCreateInstance(this, t2);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2] || t2.startsWith("_") || "constructor" === t2)
              throw new TypeError(`No method named "${t2}"`);
            e2[t2](this);
          }
        });
      }
    }
    un.on(document, "click.bs.offcanvas.data-api", '[data-bs-toggle="offcanvas"]', function(t2) {
      const e2 = Oe(this);
      if (["A", "AREA"].includes(this.tagName) && t2.preventDefault(), Pe(this))
        return;
      un.one(e2, ar, () => {
        Le(this) && this.focus();
      });
      const n2 = Sn.findOne(".offcanvas.show");
      n2 && n2 !== e2 && lr.getInstance(n2).hide(), lr.getOrCreateInstance(e2).toggle(this);
    }), un.on(window, "load.bs.offcanvas.data-api", () => Sn.find(".offcanvas.show").forEach((t2) => lr.getOrCreateInstance(t2).show())), fn(lr), $e(lr);
    const cr = /* @__PURE__ */ new Set(["background", "cite", "href", "itemtype", "longdesc", "poster", "src", "xlink:href"]), hr = /^(?:(?:https?|mailto|ftp|tel|file|sms):|[^#&/:?]*(?:[#/?]|$))/i, dr = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i, fr = (t2, e2) => {
      const n2 = t2.nodeName.toLowerCase();
      if (e2.includes(n2))
        return !cr.has(n2) || Boolean(hr.test(t2.nodeValue) || dr.test(t2.nodeValue));
      const i2 = e2.filter((t3) => t3 instanceof RegExp);
      for (let t3 = 0, e3 = i2.length; t3 < e3; t3++)
        if (i2[t3].test(n2))
          return true;
      return false;
    }, pr = { "*": ["class", "dir", "id", "lang", "role", /^aria-[\w-]*$/i], a: ["target", "href", "title", "rel"], area: [], b: [], br: [], col: [], code: [], div: [], em: [], hr: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], i: [], img: ["src", "srcset", "alt", "title", "width", "height"], li: [], ol: [], p: [], pre: [], s: [], small: [], span: [], sub: [], sup: [], strong: [], u: [], ul: [] };
    function gr(t2, e2, n2) {
      if (!t2.length)
        return t2;
      if (n2 && "function" == typeof n2)
        return n2(t2);
      const i2 = new window.DOMParser().parseFromString(t2, "text/html"), s2 = [].concat(...i2.body.querySelectorAll("*"));
      for (let t3 = 0, n3 = s2.length; t3 < n3; t3++) {
        const n4 = s2[t3], i3 = n4.nodeName.toLowerCase();
        if (!Object.keys(e2).includes(i3)) {
          n4.remove();
          continue;
        }
        const r2 = [].concat(...n4.attributes), o2 = [].concat(e2["*"] || [], e2[i3] || []);
        r2.forEach((t4) => {
          fr(t4, o2) || n4.removeAttribute(t4.nodeName);
        });
      }
      return i2.body.innerHTML;
    }
    const mr = "tooltip", vr = "bs-tooltip", _r = /* @__PURE__ */ new Set(["sanitize", "allowList", "sanitizeFn"]), yr = { animation: "boolean", template: "string", title: "(string|element|function)", trigger: "string", delay: "(number|object)", html: "boolean", selector: "(string|boolean)", placement: "(string|function)", offset: "(array|string|function)", container: "(string|element|boolean)", fallbackPlacements: "array", boundary: "(string|element)", customClass: "(string|function)", sanitize: "boolean", sanitizeFn: "(null|function)", allowList: "object", popperConfig: "(null|object|function)" }, br = { AUTO: "auto", TOP: "top", RIGHT: He() ? "left" : "right", BOTTOM: "bottom", LEFT: He() ? "right" : "left" }, kr = { animation: true, template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>', trigger: "hover focus", title: "", delay: 0, html: false, selector: false, placement: "top", offset: [0, 0], container: false, fallbackPlacements: ["top", "right", "bottom", "left"], boundary: "clippingParents", customClass: "", sanitize: true, sanitizeFn: null, allowList: pr, popperConfig: null }, Er = { HIDE: "hide.bs.tooltip", HIDDEN: "hidden.bs.tooltip", SHOW: "show.bs.tooltip", SHOWN: "shown.bs.tooltip", INSERTED: "inserted.bs.tooltip", CLICK: "click.bs.tooltip", FOCUSIN: "focusin.bs.tooltip", FOCUSOUT: "focusout.bs.tooltip", MOUSEENTER: "mouseenter.bs.tooltip", MOUSELEAVE: "mouseleave.bs.tooltip" }, wr = "fade", Ar = "show", Cr = "show", Sr = "out", Tr = ".tooltip-inner", Dr = ".modal", Or = "hide.bs.modal", Fr = "hover", xr = "focus", Br = "click", Ir = "manual";
    class Lr extends dn {
      constructor(t2, e2) {
        if (void 0 === Ce)
          throw new TypeError("Bootstrap's tooltips require Popper (https://popper.js.org)");
        super(t2), this._isEnabled = true, this._timeout = 0, this._hoverState = "", this._activeTrigger = {}, this._popper = null, this._config = this._getConfig(e2), this.tip = null, this._setListeners();
      }
      static get Default() {
        return kr;
      }
      static get NAME() {
        return mr;
      }
      static get Event() {
        return Er;
      }
      static get DefaultType() {
        return yr;
      }
      enable() {
        this._isEnabled = true;
      }
      disable() {
        this._isEnabled = false;
      }
      toggleEnabled() {
        this._isEnabled = !this._isEnabled;
      }
      toggle(t2) {
        if (this._isEnabled)
          if (t2) {
            const e2 = this._initializeOnDelegatedTarget(t2);
            e2._activeTrigger.click = !e2._activeTrigger.click, e2._isWithActiveTrigger() ? e2._enter(null, e2) : e2._leave(null, e2);
          } else {
            if (this.getTipElement().classList.contains(Ar))
              return void this._leave(null, this);
            this._enter(null, this);
          }
      }
      dispose() {
        clearTimeout(this._timeout), un.off(this._element.closest(Dr), Or, this._hideModalHandler), this.tip && this.tip.remove(), this._disposePopper(), super.dispose();
      }
      show() {
        if ("none" === this._element.style.display)
          throw new Error("Please use show on visible elements");
        if (!this.isWithContent() || !this._isEnabled)
          return;
        const t2 = un.trigger(this._element, this.constructor.Event.SHOW), e2 = Me(this._element), n2 = null === e2 ? this._element.ownerDocument.documentElement.contains(this._element) : e2.contains(this._element);
        if (t2.defaultPrevented || !n2)
          return;
        "tooltip" === this.constructor.NAME && this.tip && this.getTitle() !== this.tip.querySelector(Tr).innerHTML && (this._disposePopper(), this.tip.remove(), this.tip = null);
        const i2 = this.getTipElement(), s2 = Se(this.constructor.NAME);
        i2.setAttribute("id", s2), this._element.setAttribute("aria-describedby", s2), this._config.animation && i2.classList.add(wr);
        const r2 = "function" == typeof this._config.placement ? this._config.placement.call(this, i2, this._element) : this._config.placement, o2 = this._getAttachment(r2);
        this._addAttachmentClass(o2);
        const { container: a2 } = this._config;
        cn.set(i2, this.constructor.DATA_KEY, this), this._element.ownerDocument.documentElement.contains(this.tip) || (a2.append(i2), un.trigger(this._element, this.constructor.Event.INSERTED)), this._popper ? this._popper.update() : this._popper = Ae(this._element, i2, this._getPopperConfig(o2)), i2.classList.add(Ar);
        const u2 = this._resolvePossibleFunction(this._config.customClass);
        u2 && i2.classList.add(...u2.split(" ")), "ontouchstart" in document.documentElement && [].concat(...document.body.children).forEach((t3) => {
          un.on(t3, "mouseover", Ne);
        });
        const l2 = this.tip.classList.contains(wr);
        this._queueCallback(() => {
          const t3 = this._hoverState;
          this._hoverState = null, un.trigger(this._element, this.constructor.Event.SHOWN), t3 === Sr && this._leave(null, this);
        }, this.tip, l2);
      }
      hide() {
        if (!this._popper)
          return;
        const t2 = this.getTipElement();
        if (un.trigger(this._element, this.constructor.Event.HIDE).defaultPrevented)
          return;
        t2.classList.remove(Ar), "ontouchstart" in document.documentElement && [].concat(...document.body.children).forEach((t3) => un.off(t3, "mouseover", Ne)), this._activeTrigger[Br] = false, this._activeTrigger[xr] = false, this._activeTrigger[Fr] = false;
        const e2 = this.tip.classList.contains(wr);
        this._queueCallback(() => {
          this._isWithActiveTrigger() || (this._hoverState !== Cr && t2.remove(), this._cleanTipClass(), this._element.removeAttribute("aria-describedby"), un.trigger(this._element, this.constructor.Event.HIDDEN), this._disposePopper());
        }, this.tip, e2), this._hoverState = "";
      }
      update() {
        null !== this._popper && this._popper.update();
      }
      isWithContent() {
        return Boolean(this.getTitle());
      }
      getTipElement() {
        if (this.tip)
          return this.tip;
        const t2 = document.createElement("div");
        t2.innerHTML = this._config.template;
        const e2 = t2.children[0];
        return this.setContent(e2), e2.classList.remove(wr, Ar), this.tip = e2, this.tip;
      }
      setContent(t2) {
        this._sanitizeAndSetContent(t2, this.getTitle(), Tr);
      }
      _sanitizeAndSetContent(t2, e2, n2) {
        const i2 = Sn.findOne(n2, t2);
        e2 || !i2 ? this.setElementContent(i2, e2) : i2.remove();
      }
      setElementContent(t2, e2) {
        if (null !== t2)
          return xe(e2) ? (e2 = Be(e2), void (this._config.html ? e2.parentNode !== t2 && (t2.innerHTML = "", t2.append(e2)) : t2.textContent = e2.textContent)) : void (this._config.html ? (this._config.sanitize && (e2 = gr(e2, this._config.allowList, this._config.sanitizeFn)), t2.innerHTML = e2) : t2.textContent = e2);
      }
      getTitle() {
        const t2 = this._element.getAttribute("data-bs-original-title") || this._config.title;
        return this._resolvePossibleFunction(t2);
      }
      updateAttachment(t2) {
        return "right" === t2 ? "end" : "left" === t2 ? "start" : t2;
      }
      _initializeOnDelegatedTarget(t2, e2) {
        return e2 || this.constructor.getOrCreateInstance(t2.delegateTarget, this._getDelegateConfig());
      }
      _getOffset() {
        const { offset: t2 } = this._config;
        return "string" == typeof t2 ? t2.split(",").map((t3) => Number.parseInt(t3, 10)) : "function" == typeof t2 ? (e2) => t2(e2, this._element) : t2;
      }
      _resolvePossibleFunction(t2) {
        return "function" == typeof t2 ? t2.call(this._element) : t2;
      }
      _getPopperConfig(t2) {
        const e2 = { placement: t2, modifiers: [{ name: "flip", options: { fallbackPlacements: this._config.fallbackPlacements } }, { name: "offset", options: { offset: this._getOffset() } }, { name: "preventOverflow", options: { boundary: this._config.boundary } }, { name: "arrow", options: { element: `.${this.constructor.NAME}-arrow` } }, { name: "onChange", enabled: true, phase: "afterWrite", fn: (t3) => this._handlePopperPlacementChange(t3) }], onFirstUpdate: (t3) => {
          t3.options.placement !== t3.placement && this._handlePopperPlacementChange(t3);
        } };
        return { ...e2, ..."function" == typeof this._config.popperConfig ? this._config.popperConfig(e2) : this._config.popperConfig };
      }
      _addAttachmentClass(t2) {
        this.getTipElement().classList.add(`${this._getBasicClassPrefix()}-${this.updateAttachment(t2)}`);
      }
      _getAttachment(t2) {
        return br[t2.toUpperCase()];
      }
      _setListeners() {
        this._config.trigger.split(" ").forEach((t2) => {
          if ("click" === t2)
            un.on(this._element, this.constructor.Event.CLICK, this._config.selector, (t3) => this.toggle(t3));
          else if (t2 !== Ir) {
            const e2 = t2 === Fr ? this.constructor.Event.MOUSEENTER : this.constructor.Event.FOCUSIN, n2 = t2 === Fr ? this.constructor.Event.MOUSELEAVE : this.constructor.Event.FOCUSOUT;
            un.on(this._element, e2, this._config.selector, (t3) => this._enter(t3)), un.on(this._element, n2, this._config.selector, (t3) => this._leave(t3));
          }
        }), this._hideModalHandler = () => {
          this._element && this.hide();
        }, un.on(this._element.closest(Dr), Or, this._hideModalHandler), this._config.selector ? this._config = { ...this._config, trigger: "manual", selector: "" } : this._fixTitle();
      }
      _fixTitle() {
        const t2 = this._element.getAttribute("title"), e2 = typeof this._element.getAttribute("data-bs-original-title");
        (t2 || "string" !== e2) && (this._element.setAttribute("data-bs-original-title", t2 || ""), !t2 || this._element.getAttribute("aria-label") || this._element.textContent || this._element.setAttribute("aria-label", t2), this._element.setAttribute("title", ""));
      }
      _enter(t2, e2) {
        e2 = this._initializeOnDelegatedTarget(t2, e2), t2 && (e2._activeTrigger["focusin" === t2.type ? xr : Fr] = true), e2.getTipElement().classList.contains(Ar) || e2._hoverState === Cr ? e2._hoverState = Cr : (clearTimeout(e2._timeout), e2._hoverState = Cr, e2._config.delay && e2._config.delay.show ? e2._timeout = setTimeout(() => {
          e2._hoverState === Cr && e2.show();
        }, e2._config.delay.show) : e2.show());
      }
      _leave(t2, e2) {
        e2 = this._initializeOnDelegatedTarget(t2, e2), t2 && (e2._activeTrigger["focusout" === t2.type ? xr : Fr] = e2._element.contains(t2.relatedTarget)), e2._isWithActiveTrigger() || (clearTimeout(e2._timeout), e2._hoverState = Sr, e2._config.delay && e2._config.delay.hide ? e2._timeout = setTimeout(() => {
          e2._hoverState === Sr && e2.hide();
        }, e2._config.delay.hide) : e2.hide());
      }
      _isWithActiveTrigger() {
        for (const t2 in this._activeTrigger)
          if (this._activeTrigger[t2])
            return true;
        return false;
      }
      _getConfig(t2) {
        const e2 = Cn.getDataAttributes(this._element);
        return Object.keys(e2).forEach((t3) => {
          _r.has(t3) && delete e2[t3];
        }), (t2 = { ...this.constructor.Default, ...e2, ..."object" == typeof t2 && t2 ? t2 : {} }).container = false === t2.container ? document.body : Be(t2.container), "number" == typeof t2.delay && (t2.delay = { show: t2.delay, hide: t2.delay }), "number" == typeof t2.title && (t2.title = t2.title.toString()), "number" == typeof t2.content && (t2.content = t2.content.toString()), Ie(mr, t2, this.constructor.DefaultType), t2.sanitize && (t2.template = gr(t2.template, t2.allowList, t2.sanitizeFn)), t2;
      }
      _getDelegateConfig() {
        const t2 = {};
        for (const e2 in this._config)
          this.constructor.Default[e2] !== this._config[e2] && (t2[e2] = this._config[e2]);
        return t2;
      }
      _cleanTipClass() {
        const t2 = this.getTipElement(), e2 = new RegExp(`(^|\\s)${this._getBasicClassPrefix()}\\S+`, "g"), n2 = t2.getAttribute("class").match(e2);
        null !== n2 && n2.length > 0 && n2.map((t3) => t3.trim()).forEach((e3) => t2.classList.remove(e3));
      }
      _getBasicClassPrefix() {
        return vr;
      }
      _handlePopperPlacementChange(t2) {
        const { state: e2 } = t2;
        e2 && (this.tip = e2.elements.popper, this._cleanTipClass(), this._addAttachmentClass(this._getAttachment(e2.placement)));
      }
      _disposePopper() {
        this._popper && (this._popper.destroy(), this._popper = null);
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = Lr.getOrCreateInstance(this, t2);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2])
              throw new TypeError(`No method named "${t2}"`);
            e2[t2]();
          }
        });
      }
    }
    $e(Lr);
    const Pr = "popover", Mr = "bs-popover", Nr = { ...Lr.Default, placement: "right", offset: [0, 8], trigger: "click", content: "", template: '<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>' }, Rr = { ...Lr.DefaultType, content: "(string|element|function)" }, jr = { HIDE: "hide.bs.popover", HIDDEN: "hidden.bs.popover", SHOW: "show.bs.popover", SHOWN: "shown.bs.popover", INSERTED: "inserted.bs.popover", CLICK: "click.bs.popover", FOCUSIN: "focusin.bs.popover", FOCUSOUT: "focusout.bs.popover", MOUSEENTER: "mouseenter.bs.popover", MOUSELEAVE: "mouseleave.bs.popover" }, Vr = ".popover-header", Hr = ".popover-body";
    class $r extends Lr {
      static get Default() {
        return Nr;
      }
      static get NAME() {
        return Pr;
      }
      static get Event() {
        return jr;
      }
      static get DefaultType() {
        return Rr;
      }
      isWithContent() {
        return this.getTitle() || this._getContent();
      }
      setContent(t2) {
        this._sanitizeAndSetContent(t2, this.getTitle(), Vr), this._sanitizeAndSetContent(t2, this._getContent(), Hr);
      }
      _getContent() {
        return this._resolvePossibleFunction(this._config.content);
      }
      _getBasicClassPrefix() {
        return Mr;
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = $r.getOrCreateInstance(this, t2);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2])
              throw new TypeError(`No method named "${t2}"`);
            e2[t2]();
          }
        });
      }
    }
    $e($r);
    const zr = "scrollspy", Wr = ".bs.scrollspy", Ur = { offset: 10, method: "auto", target: "" }, qr = { offset: "number", method: "string", target: "(string|element)" }, Yr = `activate${Wr}`, Kr = `scroll${Wr}`, Xr = `load${Wr}.data-api`, Gr = "dropdown-item", Qr = "active", Zr = ".nav, .list-group", Jr = ".nav-link", to = ".nav-item", eo = ".list-group-item", no = `${Jr}, ${eo}, .${Gr}`, io = ".dropdown", so = ".dropdown-toggle", ro = "offset", oo = "position";
    class ao extends dn {
      constructor(t2, e2) {
        super(t2), this._scrollElement = "BODY" === this._element.tagName ? window : this._element, this._config = this._getConfig(e2), this._offsets = [], this._targets = [], this._activeTarget = null, this._scrollHeight = 0, un.on(this._scrollElement, Kr, () => this._process()), this.refresh(), this._process();
      }
      static get Default() {
        return Ur;
      }
      static get NAME() {
        return zr;
      }
      refresh() {
        const t2 = this._scrollElement === this._scrollElement.window ? ro : oo, e2 = "auto" === this._config.method ? t2 : this._config.method, n2 = e2 === oo ? this._getScrollTop() : 0;
        this._offsets = [], this._targets = [], this._scrollHeight = this._getScrollHeight(), Sn.find(no, this._config.target).map((t3) => {
          const i2 = De(t3), s2 = i2 ? Sn.findOne(i2) : null;
          if (s2) {
            const t4 = s2.getBoundingClientRect();
            if (t4.width || t4.height)
              return [Cn[e2](s2).top + n2, i2];
          }
          return null;
        }).filter((t3) => t3).sort((t3, e3) => t3[0] - e3[0]).forEach((t3) => {
          this._offsets.push(t3[0]), this._targets.push(t3[1]);
        });
      }
      dispose() {
        un.off(this._scrollElement, Wr), super.dispose();
      }
      _getConfig(t2) {
        return (t2 = { ...Ur, ...Cn.getDataAttributes(this._element), ..."object" == typeof t2 && t2 ? t2 : {} }).target = Be(t2.target) || document.documentElement, Ie(zr, t2, qr), t2;
      }
      _getScrollTop() {
        return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
      }
      _getScrollHeight() {
        return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      }
      _getOffsetHeight() {
        return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
      }
      _process() {
        const t2 = this._getScrollTop() + this._config.offset, e2 = this._getScrollHeight(), n2 = this._config.offset + e2 - this._getOffsetHeight();
        if (this._scrollHeight !== e2 && this.refresh(), t2 >= n2) {
          const t3 = this._targets[this._targets.length - 1];
          this._activeTarget !== t3 && this._activate(t3);
        } else {
          if (this._activeTarget && t2 < this._offsets[0] && this._offsets[0] > 0)
            return this._activeTarget = null, void this._clear();
          for (let e3 = this._offsets.length; e3--; ) {
            this._activeTarget !== this._targets[e3] && t2 >= this._offsets[e3] && (void 0 === this._offsets[e3 + 1] || t2 < this._offsets[e3 + 1]) && this._activate(this._targets[e3]);
          }
        }
      }
      _activate(t2) {
        this._activeTarget = t2, this._clear();
        const e2 = no.split(",").map((e3) => `${e3}[data-bs-target="${t2}"],${e3}[href="${t2}"]`), n2 = Sn.findOne(e2.join(","), this._config.target);
        n2.classList.add(Qr), n2.classList.contains(Gr) ? Sn.findOne(so, n2.closest(io)).classList.add(Qr) : Sn.parents(n2, Zr).forEach((t3) => {
          Sn.prev(t3, `${Jr}, ${eo}`).forEach((t4) => t4.classList.add(Qr)), Sn.prev(t3, to).forEach((t4) => {
            Sn.children(t4, Jr).forEach((t5) => t5.classList.add(Qr));
          });
        }), un.trigger(this._scrollElement, Yr, { relatedTarget: t2 });
      }
      _clear() {
        Sn.find(no, this._config.target).filter((t2) => t2.classList.contains(Qr)).forEach((t2) => t2.classList.remove(Qr));
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = ao.getOrCreateInstance(this, t2);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2])
              throw new TypeError(`No method named "${t2}"`);
            e2[t2]();
          }
        });
      }
    }
    un.on(window, Xr, () => {
      Sn.find('[data-bs-spy="scroll"]').forEach((t2) => new ao(t2));
    }), $e(ao);
    const uo = "tab", lo = "hide.bs.tab", co = "hidden.bs.tab", ho = "show.bs.tab", fo = "shown.bs.tab", po = "dropdown-menu", go = "active", mo = "fade", vo = "show", _o = ".dropdown", yo = ".nav, .list-group", bo = ".active", ko = ":scope > li > .active", Eo = ".dropdown-toggle", wo = ":scope > .dropdown-menu .active";
    class Ao extends dn {
      static get NAME() {
        return uo;
      }
      show() {
        if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && this._element.classList.contains(go))
          return;
        let t2;
        const e2 = Oe(this._element), n2 = this._element.closest(yo);
        if (n2) {
          const e3 = "UL" === n2.nodeName || "OL" === n2.nodeName ? ko : bo;
          t2 = (t2 = Sn.find(e3, n2))[t2.length - 1];
        }
        const i2 = t2 ? un.trigger(t2, lo, { relatedTarget: this._element }) : null;
        if (un.trigger(this._element, ho, { relatedTarget: t2 }).defaultPrevented || null !== i2 && i2.defaultPrevented)
          return;
        this._activate(this._element, n2);
        const s2 = () => {
          un.trigger(t2, co, { relatedTarget: this._element }), un.trigger(this._element, fo, { relatedTarget: t2 });
        };
        e2 ? this._activate(e2, e2.parentNode, s2) : s2();
      }
      _activate(t2, e2, n2) {
        const i2 = (!e2 || "UL" !== e2.nodeName && "OL" !== e2.nodeName ? Sn.children(e2, bo) : Sn.find(ko, e2))[0], s2 = n2 && i2 && i2.classList.contains(mo), r2 = () => this._transitionComplete(t2, i2, n2);
        i2 && s2 ? (i2.classList.remove(vo), this._queueCallback(r2, t2, true)) : r2();
      }
      _transitionComplete(t2, e2, n2) {
        if (e2) {
          e2.classList.remove(go);
          const t3 = Sn.findOne(wo, e2.parentNode);
          t3 && t3.classList.remove(go), "tab" === e2.getAttribute("role") && e2.setAttribute("aria-selected", false);
        }
        t2.classList.add(go), "tab" === t2.getAttribute("role") && t2.setAttribute("aria-selected", true), Re(t2), t2.classList.contains(mo) && t2.classList.add(vo);
        let i2 = t2.parentNode;
        if (i2 && "LI" === i2.nodeName && (i2 = i2.parentNode), i2 && i2.classList.contains(po)) {
          const e3 = t2.closest(_o);
          e3 && Sn.find(Eo, e3).forEach((t3) => t3.classList.add(go)), t2.setAttribute("aria-expanded", true);
        }
        n2 && n2();
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = Ao.getOrCreateInstance(this);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2])
              throw new TypeError(`No method named "${t2}"`);
            e2[t2]();
          }
        });
      }
    }
    un.on(document, "click.bs.tab.data-api", '[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]', function(t2) {
      if (["A", "AREA"].includes(this.tagName) && t2.preventDefault(), Pe(this))
        return;
      Ao.getOrCreateInstance(this).show();
    }), $e(Ao);
    const Co = "toast", So = "mouseover.bs.toast", To = "mouseout.bs.toast", Do = "focusin.bs.toast", Oo = "focusout.bs.toast", Fo = "hide.bs.toast", xo = "hidden.bs.toast", Bo = "show.bs.toast", Io = "shown.bs.toast", Lo = "fade", Po = "hide", Mo = "show", No = "showing", Ro = { animation: "boolean", autohide: "boolean", delay: "number" }, jo = { animation: true, autohide: true, delay: 5e3 };
    class Vo extends dn {
      constructor(t2, e2) {
        super(t2), this._config = this._getConfig(e2), this._timeout = null, this._hasMouseInteraction = false, this._hasKeyboardInteraction = false, this._setListeners();
      }
      static get DefaultType() {
        return Ro;
      }
      static get Default() {
        return jo;
      }
      static get NAME() {
        return Co;
      }
      show() {
        if (un.trigger(this._element, Bo).defaultPrevented)
          return;
        this._clearTimeout(), this._config.animation && this._element.classList.add(Lo);
        this._element.classList.remove(Po), Re(this._element), this._element.classList.add(Mo), this._element.classList.add(No), this._queueCallback(() => {
          this._element.classList.remove(No), un.trigger(this._element, Io), this._maybeScheduleHide();
        }, this._element, this._config.animation);
      }
      hide() {
        if (!this._element.classList.contains(Mo))
          return;
        if (un.trigger(this._element, Fo).defaultPrevented)
          return;
        this._element.classList.add(No), this._queueCallback(() => {
          this._element.classList.add(Po), this._element.classList.remove(No), this._element.classList.remove(Mo), un.trigger(this._element, xo);
        }, this._element, this._config.animation);
      }
      dispose() {
        this._clearTimeout(), this._element.classList.contains(Mo) && this._element.classList.remove(Mo), super.dispose();
      }
      _getConfig(t2) {
        return t2 = { ...jo, ...Cn.getDataAttributes(this._element), ..."object" == typeof t2 && t2 ? t2 : {} }, Ie(Co, t2, this.constructor.DefaultType), t2;
      }
      _maybeScheduleHide() {
        this._config.autohide && (this._hasMouseInteraction || this._hasKeyboardInteraction || (this._timeout = setTimeout(() => {
          this.hide();
        }, this._config.delay)));
      }
      _onInteraction(t2, e2) {
        switch (t2.type) {
          case "mouseover":
          case "mouseout":
            this._hasMouseInteraction = e2;
            break;
          case "focusin":
          case "focusout":
            this._hasKeyboardInteraction = e2;
        }
        if (e2)
          return void this._clearTimeout();
        const n2 = t2.relatedTarget;
        this._element === n2 || this._element.contains(n2) || this._maybeScheduleHide();
      }
      _setListeners() {
        un.on(this._element, So, (t2) => this._onInteraction(t2, true)), un.on(this._element, To, (t2) => this._onInteraction(t2, false)), un.on(this._element, Do, (t2) => this._onInteraction(t2, true)), un.on(this._element, Oo, (t2) => this._onInteraction(t2, false));
      }
      _clearTimeout() {
        clearTimeout(this._timeout), this._timeout = null;
      }
      static jQueryInterface(t2) {
        return this.each(function() {
          const e2 = Vo.getOrCreateInstance(this, t2);
          if ("string" == typeof t2) {
            if (void 0 === e2[t2])
              throw new TypeError(`No method named "${t2}"`);
            e2[t2](this);
          }
        });
      }
    }
    fn(Vo), $e(Vo);
    var Ho = Object.freeze({ __proto__: null, Alert: yn, Button: En, Carousel: hi, Collapse: Bi, Dropdown: us, Modal: Qs, Offcanvas: lr, Popover: $r, ScrollSpy: ao, Tab: Ao, Toast: Vo, Tooltip: Lr });
    [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]')).map(function(t2) {
      return new us(t2);
    }), [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]')).map(function(t2) {
      var e2, n2, i2 = { delay: { show: 50, hide: 50 }, html: null !== (e2 = "true" === t2.getAttribute("data-bs-html")) && void 0 !== e2 && e2, placement: null !== (n2 = t2.getAttribute("data-bs-placement")) && void 0 !== n2 ? n2 : "auto" };
      return new Lr(t2, i2);
    }), [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]')).map(function(t2) {
      var e2, n2, i2 = { delay: { show: 50, hide: 50 }, html: null !== (e2 = "true" === t2.getAttribute("data-bs-html")) && void 0 !== e2 && e2, placement: null !== (n2 = t2.getAttribute("data-bs-placement")) && void 0 !== n2 ? n2 : "auto" };
      return new $r(t2, i2);
    }), [].slice.call(document.querySelectorAll('[data-bs-toggle="switch-icon"]')).map(function(t2) {
      t2.addEventListener("click", function(e2) {
        e2.stopPropagation(), t2.classList.toggle("active");
      });
    });
    var $o;
    [].slice.call(document.querySelectorAll('[data-bs-toggle="toast"]')).map(function(t2) {
      return new Vo(t2);
    }), window.bootstrap = Ho, ($o = window.location.hash) && [].slice.call(document.querySelectorAll('[data-bs-toggle="tab"]')).filter(function(t2) {
      return t2.hash === $o;
    }).map(function(t2) {
      new Ao(t2).show();
    });
  });

  // node_modules/@hotwired/stimulus/dist/stimulus.js
  var EventListener = class {
    constructor(eventTarget, eventName, eventOptions) {
      this.eventTarget = eventTarget;
      this.eventName = eventName;
      this.eventOptions = eventOptions;
      this.unorderedBindings = /* @__PURE__ */ new Set();
    }
    connect() {
      this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
    }
    disconnect() {
      this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions);
    }
    bindingConnected(binding) {
      this.unorderedBindings.add(binding);
    }
    bindingDisconnected(binding) {
      this.unorderedBindings.delete(binding);
    }
    handleEvent(event) {
      const extendedEvent = extendEvent(event);
      for (const binding of this.bindings) {
        if (extendedEvent.immediatePropagationStopped) {
          break;
        } else {
          binding.handleEvent(extendedEvent);
        }
      }
    }
    hasBindings() {
      return this.unorderedBindings.size > 0;
    }
    get bindings() {
      return Array.from(this.unorderedBindings).sort((left, right) => {
        const leftIndex = left.index, rightIndex = right.index;
        return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0;
      });
    }
  };
  function extendEvent(event) {
    if ("immediatePropagationStopped" in event) {
      return event;
    } else {
      const { stopImmediatePropagation } = event;
      return Object.assign(event, {
        immediatePropagationStopped: false,
        stopImmediatePropagation() {
          this.immediatePropagationStopped = true;
          stopImmediatePropagation.call(this);
        }
      });
    }
  }
  var Dispatcher = class {
    constructor(application2) {
      this.application = application2;
      this.eventListenerMaps = /* @__PURE__ */ new Map();
      this.started = false;
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.eventListeners.forEach((eventListener) => eventListener.connect());
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.eventListeners.forEach((eventListener) => eventListener.disconnect());
      }
    }
    get eventListeners() {
      return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), []);
    }
    bindingConnected(binding) {
      this.fetchEventListenerForBinding(binding).bindingConnected(binding);
    }
    bindingDisconnected(binding, clearEventListeners = false) {
      this.fetchEventListenerForBinding(binding).bindingDisconnected(binding);
      if (clearEventListeners)
        this.clearEventListenersForBinding(binding);
    }
    handleError(error2, message, detail = {}) {
      this.application.handleError(error2, `Error ${message}`, detail);
    }
    clearEventListenersForBinding(binding) {
      const eventListener = this.fetchEventListenerForBinding(binding);
      if (!eventListener.hasBindings()) {
        eventListener.disconnect();
        this.removeMappedEventListenerFor(binding);
      }
    }
    removeMappedEventListenerFor(binding) {
      const { eventTarget, eventName, eventOptions } = binding;
      const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
      const cacheKey = this.cacheKey(eventName, eventOptions);
      eventListenerMap.delete(cacheKey);
      if (eventListenerMap.size == 0)
        this.eventListenerMaps.delete(eventTarget);
    }
    fetchEventListenerForBinding(binding) {
      const { eventTarget, eventName, eventOptions } = binding;
      return this.fetchEventListener(eventTarget, eventName, eventOptions);
    }
    fetchEventListener(eventTarget, eventName, eventOptions) {
      const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
      const cacheKey = this.cacheKey(eventName, eventOptions);
      let eventListener = eventListenerMap.get(cacheKey);
      if (!eventListener) {
        eventListener = this.createEventListener(eventTarget, eventName, eventOptions);
        eventListenerMap.set(cacheKey, eventListener);
      }
      return eventListener;
    }
    createEventListener(eventTarget, eventName, eventOptions) {
      const eventListener = new EventListener(eventTarget, eventName, eventOptions);
      if (this.started) {
        eventListener.connect();
      }
      return eventListener;
    }
    fetchEventListenerMapForEventTarget(eventTarget) {
      let eventListenerMap = this.eventListenerMaps.get(eventTarget);
      if (!eventListenerMap) {
        eventListenerMap = /* @__PURE__ */ new Map();
        this.eventListenerMaps.set(eventTarget, eventListenerMap);
      }
      return eventListenerMap;
    }
    cacheKey(eventName, eventOptions) {
      const parts = [eventName];
      Object.keys(eventOptions).sort().forEach((key) => {
        parts.push(`${eventOptions[key] ? "" : "!"}${key}`);
      });
      return parts.join(":");
    }
  };
  var defaultActionDescriptorFilters = {
    stop({ event, value }) {
      if (value)
        event.stopPropagation();
      return true;
    },
    prevent({ event, value }) {
      if (value)
        event.preventDefault();
      return true;
    },
    self({ event, value, element }) {
      if (value) {
        return element === event.target;
      } else {
        return true;
      }
    }
  };
  var descriptorPattern = /^(?:(.+?)(?:\.(.+?))?(?:@(window|document))?->)?(.+?)(?:#([^:]+?))(?::(.+))?$/;
  function parseActionDescriptorString(descriptorString) {
    const source = descriptorString.trim();
    const matches = source.match(descriptorPattern) || [];
    let eventName = matches[1];
    let keyFilter = matches[2];
    if (keyFilter && !["keydown", "keyup", "keypress"].includes(eventName)) {
      eventName += `.${keyFilter}`;
      keyFilter = "";
    }
    return {
      eventTarget: parseEventTarget(matches[3]),
      eventName,
      eventOptions: matches[6] ? parseEventOptions(matches[6]) : {},
      identifier: matches[4],
      methodName: matches[5],
      keyFilter
    };
  }
  function parseEventTarget(eventTargetName) {
    if (eventTargetName == "window") {
      return window;
    } else if (eventTargetName == "document") {
      return document;
    }
  }
  function parseEventOptions(eventOptions) {
    return eventOptions.split(":").reduce((options, token) => Object.assign(options, { [token.replace(/^!/, "")]: !/^!/.test(token) }), {});
  }
  function stringifyEventTarget(eventTarget) {
    if (eventTarget == window) {
      return "window";
    } else if (eventTarget == document) {
      return "document";
    }
  }
  function camelize(value) {
    return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase());
  }
  function namespaceCamelize(value) {
    return camelize(value.replace(/--/g, "-").replace(/__/g, "_"));
  }
  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function dasherize(value) {
    return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);
  }
  function tokenize(value) {
    return value.match(/[^\s]+/g) || [];
  }
  var Action = class {
    constructor(element, index, descriptor, schema) {
      this.element = element;
      this.index = index;
      this.eventTarget = descriptor.eventTarget || element;
      this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error("missing event name");
      this.eventOptions = descriptor.eventOptions || {};
      this.identifier = descriptor.identifier || error("missing identifier");
      this.methodName = descriptor.methodName || error("missing method name");
      this.keyFilter = descriptor.keyFilter || "";
      this.schema = schema;
    }
    static forToken(token, schema) {
      return new this(token.element, token.index, parseActionDescriptorString(token.content), schema);
    }
    toString() {
      const eventFilter = this.keyFilter ? `.${this.keyFilter}` : "";
      const eventTarget = this.eventTargetName ? `@${this.eventTargetName}` : "";
      return `${this.eventName}${eventFilter}${eventTarget}->${this.identifier}#${this.methodName}`;
    }
    isFilterTarget(event) {
      if (!this.keyFilter) {
        return false;
      }
      const filteres = this.keyFilter.split("+");
      const modifiers = ["meta", "ctrl", "alt", "shift"];
      const [meta, ctrl, alt, shift] = modifiers.map((modifier) => filteres.includes(modifier));
      if (event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== alt || event.shiftKey !== shift) {
        return true;
      }
      const standardFilter = filteres.filter((key) => !modifiers.includes(key))[0];
      if (!standardFilter) {
        return false;
      }
      if (!Object.prototype.hasOwnProperty.call(this.keyMappings, standardFilter)) {
        error(`contains unknown key filter: ${this.keyFilter}`);
      }
      return this.keyMappings[standardFilter].toLowerCase() !== event.key.toLowerCase();
    }
    get params() {
      const params = {};
      const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`, "i");
      for (const { name, value } of Array.from(this.element.attributes)) {
        const match = name.match(pattern);
        const key = match && match[1];
        if (key) {
          params[camelize(key)] = typecast(value);
        }
      }
      return params;
    }
    get eventTargetName() {
      return stringifyEventTarget(this.eventTarget);
    }
    get keyMappings() {
      return this.schema.keyMappings;
    }
  };
  var defaultEventNames = {
    a: () => "click",
    button: () => "click",
    form: () => "submit",
    details: () => "toggle",
    input: (e) => e.getAttribute("type") == "submit" ? "click" : "input",
    select: () => "change",
    textarea: () => "input"
  };
  function getDefaultEventNameForElement(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName in defaultEventNames) {
      return defaultEventNames[tagName](element);
    }
  }
  function error(message) {
    throw new Error(message);
  }
  function typecast(value) {
    try {
      return JSON.parse(value);
    } catch (o_O) {
      return value;
    }
  }
  var Binding = class {
    constructor(context, action) {
      this.context = context;
      this.action = action;
    }
    get index() {
      return this.action.index;
    }
    get eventTarget() {
      return this.action.eventTarget;
    }
    get eventOptions() {
      return this.action.eventOptions;
    }
    get identifier() {
      return this.context.identifier;
    }
    handleEvent(event) {
      if (this.willBeInvokedByEvent(event) && this.applyEventModifiers(event)) {
        this.invokeWithEvent(event);
      }
    }
    get eventName() {
      return this.action.eventName;
    }
    get method() {
      const method = this.controller[this.methodName];
      if (typeof method == "function") {
        return method;
      }
      throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`);
    }
    applyEventModifiers(event) {
      const { element } = this.action;
      const { actionDescriptorFilters } = this.context.application;
      let passes = true;
      for (const [name, value] of Object.entries(this.eventOptions)) {
        if (name in actionDescriptorFilters) {
          const filter = actionDescriptorFilters[name];
          passes = passes && filter({ name, value, event, element });
        } else {
          continue;
        }
      }
      return passes;
    }
    invokeWithEvent(event) {
      const { target, currentTarget } = event;
      try {
        const { params } = this.action;
        const actionEvent = Object.assign(event, { params });
        this.method.call(this.controller, actionEvent);
        this.context.logDebugActivity(this.methodName, { event, target, currentTarget, action: this.methodName });
      } catch (error2) {
        const { identifier, controller, element, index } = this;
        const detail = { identifier, controller, element, index, event };
        this.context.handleError(error2, `invoking action "${this.action}"`, detail);
      }
    }
    willBeInvokedByEvent(event) {
      const eventTarget = event.target;
      if (event instanceof KeyboardEvent && this.action.isFilterTarget(event)) {
        return false;
      }
      if (this.element === eventTarget) {
        return true;
      } else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
        return this.scope.containsElement(eventTarget);
      } else {
        return this.scope.containsElement(this.action.element);
      }
    }
    get controller() {
      return this.context.controller;
    }
    get methodName() {
      return this.action.methodName;
    }
    get element() {
      return this.scope.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  var ElementObserver = class {
    constructor(element, delegate) {
      this.mutationObserverInit = { attributes: true, childList: true, subtree: true };
      this.element = element;
      this.started = false;
      this.delegate = delegate;
      this.elements = /* @__PURE__ */ new Set();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.refresh();
      }
    }
    pause(callback) {
      if (this.started) {
        this.mutationObserver.disconnect();
        this.started = false;
      }
      callback();
      if (!this.started) {
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        const matches = new Set(this.matchElementsInTree());
        for (const element of Array.from(this.elements)) {
          if (!matches.has(element)) {
            this.removeElement(element);
          }
        }
        for (const element of Array.from(matches)) {
          this.addElement(element);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      if (mutation.type == "attributes") {
        this.processAttributeChange(mutation.target, mutation.attributeName);
      } else if (mutation.type == "childList") {
        this.processRemovedNodes(mutation.removedNodes);
        this.processAddedNodes(mutation.addedNodes);
      }
    }
    processAttributeChange(node, attributeName) {
      const element = node;
      if (this.elements.has(element)) {
        if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
          this.delegate.elementAttributeChanged(element, attributeName);
        } else {
          this.removeElement(element);
        }
      } else if (this.matchElement(element)) {
        this.addElement(element);
      }
    }
    processRemovedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element) {
          this.processTree(element, this.removeElement);
        }
      }
    }
    processAddedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element && this.elementIsActive(element)) {
          this.processTree(element, this.addElement);
        }
      }
    }
    matchElement(element) {
      return this.delegate.matchElement(element);
    }
    matchElementsInTree(tree = this.element) {
      return this.delegate.matchElementsInTree(tree);
    }
    processTree(tree, processor) {
      for (const element of this.matchElementsInTree(tree)) {
        processor.call(this, element);
      }
    }
    elementFromNode(node) {
      if (node.nodeType == Node.ELEMENT_NODE) {
        return node;
      }
    }
    elementIsActive(element) {
      if (element.isConnected != this.element.isConnected) {
        return false;
      } else {
        return this.element.contains(element);
      }
    }
    addElement(element) {
      if (!this.elements.has(element)) {
        if (this.elementIsActive(element)) {
          this.elements.add(element);
          if (this.delegate.elementMatched) {
            this.delegate.elementMatched(element);
          }
        }
      }
    }
    removeElement(element) {
      if (this.elements.has(element)) {
        this.elements.delete(element);
        if (this.delegate.elementUnmatched) {
          this.delegate.elementUnmatched(element);
        }
      }
    }
  };
  var AttributeObserver = class {
    constructor(element, attributeName, delegate) {
      this.attributeName = attributeName;
      this.delegate = delegate;
      this.elementObserver = new ElementObserver(element, this);
    }
    get element() {
      return this.elementObserver.element;
    }
    get selector() {
      return `[${this.attributeName}]`;
    }
    start() {
      this.elementObserver.start();
    }
    pause(callback) {
      this.elementObserver.pause(callback);
    }
    stop() {
      this.elementObserver.stop();
    }
    refresh() {
      this.elementObserver.refresh();
    }
    get started() {
      return this.elementObserver.started;
    }
    matchElement(element) {
      return element.hasAttribute(this.attributeName);
    }
    matchElementsInTree(tree) {
      const match = this.matchElement(tree) ? [tree] : [];
      const matches = Array.from(tree.querySelectorAll(this.selector));
      return match.concat(matches);
    }
    elementMatched(element) {
      if (this.delegate.elementMatchedAttribute) {
        this.delegate.elementMatchedAttribute(element, this.attributeName);
      }
    }
    elementUnmatched(element) {
      if (this.delegate.elementUnmatchedAttribute) {
        this.delegate.elementUnmatchedAttribute(element, this.attributeName);
      }
    }
    elementAttributeChanged(element, attributeName) {
      if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
        this.delegate.elementAttributeValueChanged(element, attributeName);
      }
    }
  };
  function add(map, key, value) {
    fetch2(map, key).add(value);
  }
  function del(map, key, value) {
    fetch2(map, key).delete(value);
    prune(map, key);
  }
  function fetch2(map, key) {
    let values = map.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      map.set(key, values);
    }
    return values;
  }
  function prune(map, key) {
    const values = map.get(key);
    if (values != null && values.size == 0) {
      map.delete(key);
    }
  }
  var Multimap = class {
    constructor() {
      this.valuesByKey = /* @__PURE__ */ new Map();
    }
    get keys() {
      return Array.from(this.valuesByKey.keys());
    }
    get values() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((values, set) => values.concat(Array.from(set)), []);
    }
    get size() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((size, set) => size + set.size, 0);
    }
    add(key, value) {
      add(this.valuesByKey, key, value);
    }
    delete(key, value) {
      del(this.valuesByKey, key, value);
    }
    has(key, value) {
      const values = this.valuesByKey.get(key);
      return values != null && values.has(value);
    }
    hasKey(key) {
      return this.valuesByKey.has(key);
    }
    hasValue(value) {
      const sets = Array.from(this.valuesByKey.values());
      return sets.some((set) => set.has(value));
    }
    getValuesForKey(key) {
      const values = this.valuesByKey.get(key);
      return values ? Array.from(values) : [];
    }
    getKeysForValue(value) {
      return Array.from(this.valuesByKey).filter(([_key, values]) => values.has(value)).map(([key, _values]) => key);
    }
  };
  var SelectorObserver = class {
    constructor(element, selector, delegate, details = {}) {
      this.selector = selector;
      this.details = details;
      this.elementObserver = new ElementObserver(element, this);
      this.delegate = delegate;
      this.matchesByElement = new Multimap();
    }
    get started() {
      return this.elementObserver.started;
    }
    start() {
      this.elementObserver.start();
    }
    pause(callback) {
      this.elementObserver.pause(callback);
    }
    stop() {
      this.elementObserver.stop();
    }
    refresh() {
      this.elementObserver.refresh();
    }
    get element() {
      return this.elementObserver.element;
    }
    matchElement(element) {
      const matches = element.matches(this.selector);
      if (this.delegate.selectorMatchElement) {
        return matches && this.delegate.selectorMatchElement(element, this.details);
      }
      return matches;
    }
    matchElementsInTree(tree) {
      const match = this.matchElement(tree) ? [tree] : [];
      const matches = Array.from(tree.querySelectorAll(this.selector)).filter((match2) => this.matchElement(match2));
      return match.concat(matches);
    }
    elementMatched(element) {
      this.selectorMatched(element);
    }
    elementUnmatched(element) {
      this.selectorUnmatched(element);
    }
    elementAttributeChanged(element, _attributeName) {
      const matches = this.matchElement(element);
      const matchedBefore = this.matchesByElement.has(this.selector, element);
      if (!matches && matchedBefore) {
        this.selectorUnmatched(element);
      }
    }
    selectorMatched(element) {
      if (this.delegate.selectorMatched) {
        this.delegate.selectorMatched(element, this.selector, this.details);
        this.matchesByElement.add(this.selector, element);
      }
    }
    selectorUnmatched(element) {
      this.delegate.selectorUnmatched(element, this.selector, this.details);
      this.matchesByElement.delete(this.selector, element);
    }
  };
  var StringMapObserver = class {
    constructor(element, delegate) {
      this.element = element;
      this.delegate = delegate;
      this.started = false;
      this.stringMap = /* @__PURE__ */ new Map();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, { attributes: true, attributeOldValue: true });
        this.refresh();
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        for (const attributeName of this.knownAttributeNames) {
          this.refreshAttribute(attributeName, null);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      const attributeName = mutation.attributeName;
      if (attributeName) {
        this.refreshAttribute(attributeName, mutation.oldValue);
      }
    }
    refreshAttribute(attributeName, oldValue) {
      const key = this.delegate.getStringMapKeyForAttribute(attributeName);
      if (key != null) {
        if (!this.stringMap.has(attributeName)) {
          this.stringMapKeyAdded(key, attributeName);
        }
        const value = this.element.getAttribute(attributeName);
        if (this.stringMap.get(attributeName) != value) {
          this.stringMapValueChanged(value, key, oldValue);
        }
        if (value == null) {
          const oldValue2 = this.stringMap.get(attributeName);
          this.stringMap.delete(attributeName);
          if (oldValue2)
            this.stringMapKeyRemoved(key, attributeName, oldValue2);
        } else {
          this.stringMap.set(attributeName, value);
        }
      }
    }
    stringMapKeyAdded(key, attributeName) {
      if (this.delegate.stringMapKeyAdded) {
        this.delegate.stringMapKeyAdded(key, attributeName);
      }
    }
    stringMapValueChanged(value, key, oldValue) {
      if (this.delegate.stringMapValueChanged) {
        this.delegate.stringMapValueChanged(value, key, oldValue);
      }
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      if (this.delegate.stringMapKeyRemoved) {
        this.delegate.stringMapKeyRemoved(key, attributeName, oldValue);
      }
    }
    get knownAttributeNames() {
      return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)));
    }
    get currentAttributeNames() {
      return Array.from(this.element.attributes).map((attribute) => attribute.name);
    }
    get recordedAttributeNames() {
      return Array.from(this.stringMap.keys());
    }
  };
  var TokenListObserver = class {
    constructor(element, attributeName, delegate) {
      this.attributeObserver = new AttributeObserver(element, attributeName, this);
      this.delegate = delegate;
      this.tokensByElement = new Multimap();
    }
    get started() {
      return this.attributeObserver.started;
    }
    start() {
      this.attributeObserver.start();
    }
    pause(callback) {
      this.attributeObserver.pause(callback);
    }
    stop() {
      this.attributeObserver.stop();
    }
    refresh() {
      this.attributeObserver.refresh();
    }
    get element() {
      return this.attributeObserver.element;
    }
    get attributeName() {
      return this.attributeObserver.attributeName;
    }
    elementMatchedAttribute(element) {
      this.tokensMatched(this.readTokensForElement(element));
    }
    elementAttributeValueChanged(element) {
      const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element);
      this.tokensUnmatched(unmatchedTokens);
      this.tokensMatched(matchedTokens);
    }
    elementUnmatchedAttribute(element) {
      this.tokensUnmatched(this.tokensByElement.getValuesForKey(element));
    }
    tokensMatched(tokens) {
      tokens.forEach((token) => this.tokenMatched(token));
    }
    tokensUnmatched(tokens) {
      tokens.forEach((token) => this.tokenUnmatched(token));
    }
    tokenMatched(token) {
      this.delegate.tokenMatched(token);
      this.tokensByElement.add(token.element, token);
    }
    tokenUnmatched(token) {
      this.delegate.tokenUnmatched(token);
      this.tokensByElement.delete(token.element, token);
    }
    refreshTokensForElement(element) {
      const previousTokens = this.tokensByElement.getValuesForKey(element);
      const currentTokens = this.readTokensForElement(element);
      const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken));
      if (firstDifferingIndex == -1) {
        return [[], []];
      } else {
        return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)];
      }
    }
    readTokensForElement(element) {
      const attributeName = this.attributeName;
      const tokenString = element.getAttribute(attributeName) || "";
      return parseTokenString(tokenString, element, attributeName);
    }
  };
  function parseTokenString(tokenString, element, attributeName) {
    return tokenString.trim().split(/\s+/).filter((content) => content.length).map((content, index) => ({ element, attributeName, content, index }));
  }
  function zip(left, right) {
    const length = Math.max(left.length, right.length);
    return Array.from({ length }, (_, index) => [left[index], right[index]]);
  }
  function tokensAreEqual(left, right) {
    return left && right && left.index == right.index && left.content == right.content;
  }
  var ValueListObserver = class {
    constructor(element, attributeName, delegate) {
      this.tokenListObserver = new TokenListObserver(element, attributeName, this);
      this.delegate = delegate;
      this.parseResultsByToken = /* @__PURE__ */ new WeakMap();
      this.valuesByTokenByElement = /* @__PURE__ */ new WeakMap();
    }
    get started() {
      return this.tokenListObserver.started;
    }
    start() {
      this.tokenListObserver.start();
    }
    stop() {
      this.tokenListObserver.stop();
    }
    refresh() {
      this.tokenListObserver.refresh();
    }
    get element() {
      return this.tokenListObserver.element;
    }
    get attributeName() {
      return this.tokenListObserver.attributeName;
    }
    tokenMatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).set(token, value);
        this.delegate.elementMatchedValue(element, value);
      }
    }
    tokenUnmatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).delete(token);
        this.delegate.elementUnmatchedValue(element, value);
      }
    }
    fetchParseResultForToken(token) {
      let parseResult = this.parseResultsByToken.get(token);
      if (!parseResult) {
        parseResult = this.parseToken(token);
        this.parseResultsByToken.set(token, parseResult);
      }
      return parseResult;
    }
    fetchValuesByTokenForElement(element) {
      let valuesByToken = this.valuesByTokenByElement.get(element);
      if (!valuesByToken) {
        valuesByToken = /* @__PURE__ */ new Map();
        this.valuesByTokenByElement.set(element, valuesByToken);
      }
      return valuesByToken;
    }
    parseToken(token) {
      try {
        const value = this.delegate.parseValueForToken(token);
        return { value };
      } catch (error2) {
        return { error: error2 };
      }
    }
  };
  var BindingObserver = class {
    constructor(context, delegate) {
      this.context = context;
      this.delegate = delegate;
      this.bindingsByAction = /* @__PURE__ */ new Map();
    }
    start() {
      if (!this.valueListObserver) {
        this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this);
        this.valueListObserver.start();
      }
    }
    stop() {
      if (this.valueListObserver) {
        this.valueListObserver.stop();
        delete this.valueListObserver;
        this.disconnectAllActions();
      }
    }
    get element() {
      return this.context.element;
    }
    get identifier() {
      return this.context.identifier;
    }
    get actionAttribute() {
      return this.schema.actionAttribute;
    }
    get schema() {
      return this.context.schema;
    }
    get bindings() {
      return Array.from(this.bindingsByAction.values());
    }
    connectAction(action) {
      const binding = new Binding(this.context, action);
      this.bindingsByAction.set(action, binding);
      this.delegate.bindingConnected(binding);
    }
    disconnectAction(action) {
      const binding = this.bindingsByAction.get(action);
      if (binding) {
        this.bindingsByAction.delete(action);
        this.delegate.bindingDisconnected(binding);
      }
    }
    disconnectAllActions() {
      this.bindings.forEach((binding) => this.delegate.bindingDisconnected(binding, true));
      this.bindingsByAction.clear();
    }
    parseValueForToken(token) {
      const action = Action.forToken(token, this.schema);
      if (action.identifier == this.identifier) {
        return action;
      }
    }
    elementMatchedValue(element, action) {
      this.connectAction(action);
    }
    elementUnmatchedValue(element, action) {
      this.disconnectAction(action);
    }
  };
  var ValueObserver = class {
    constructor(context, receiver) {
      this.context = context;
      this.receiver = receiver;
      this.stringMapObserver = new StringMapObserver(this.element, this);
      this.valueDescriptorMap = this.controller.valueDescriptorMap;
    }
    start() {
      this.stringMapObserver.start();
      this.invokeChangedCallbacksForDefaultValues();
    }
    stop() {
      this.stringMapObserver.stop();
    }
    get element() {
      return this.context.element;
    }
    get controller() {
      return this.context.controller;
    }
    getStringMapKeyForAttribute(attributeName) {
      if (attributeName in this.valueDescriptorMap) {
        return this.valueDescriptorMap[attributeName].name;
      }
    }
    stringMapKeyAdded(key, attributeName) {
      const descriptor = this.valueDescriptorMap[attributeName];
      if (!this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue));
      }
    }
    stringMapValueChanged(value, name, oldValue) {
      const descriptor = this.valueDescriptorNameMap[name];
      if (value === null)
        return;
      if (oldValue === null) {
        oldValue = descriptor.writer(descriptor.defaultValue);
      }
      this.invokeChangedCallback(name, value, oldValue);
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      const descriptor = this.valueDescriptorNameMap[key];
      if (this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue);
      } else {
        this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue);
      }
    }
    invokeChangedCallbacksForDefaultValues() {
      for (const { key, name, defaultValue, writer } of this.valueDescriptors) {
        if (defaultValue != void 0 && !this.controller.data.has(key)) {
          this.invokeChangedCallback(name, writer(defaultValue), void 0);
        }
      }
    }
    invokeChangedCallback(name, rawValue, rawOldValue) {
      const changedMethodName = `${name}Changed`;
      const changedMethod = this.receiver[changedMethodName];
      if (typeof changedMethod == "function") {
        const descriptor = this.valueDescriptorNameMap[name];
        try {
          const value = descriptor.reader(rawValue);
          let oldValue = rawOldValue;
          if (rawOldValue) {
            oldValue = descriptor.reader(rawOldValue);
          }
          changedMethod.call(this.receiver, value, oldValue);
        } catch (error2) {
          if (error2 instanceof TypeError) {
            error2.message = `Stimulus Value "${this.context.identifier}.${descriptor.name}" - ${error2.message}`;
          }
          throw error2;
        }
      }
    }
    get valueDescriptors() {
      const { valueDescriptorMap } = this;
      return Object.keys(valueDescriptorMap).map((key) => valueDescriptorMap[key]);
    }
    get valueDescriptorNameMap() {
      const descriptors = {};
      Object.keys(this.valueDescriptorMap).forEach((key) => {
        const descriptor = this.valueDescriptorMap[key];
        descriptors[descriptor.name] = descriptor;
      });
      return descriptors;
    }
    hasValue(attributeName) {
      const descriptor = this.valueDescriptorNameMap[attributeName];
      const hasMethodName = `has${capitalize(descriptor.name)}`;
      return this.receiver[hasMethodName];
    }
  };
  var TargetObserver = class {
    constructor(context, delegate) {
      this.context = context;
      this.delegate = delegate;
      this.targetsByName = new Multimap();
    }
    start() {
      if (!this.tokenListObserver) {
        this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this);
        this.tokenListObserver.start();
      }
    }
    stop() {
      if (this.tokenListObserver) {
        this.disconnectAllTargets();
        this.tokenListObserver.stop();
        delete this.tokenListObserver;
      }
    }
    tokenMatched({ element, content: name }) {
      if (this.scope.containsElement(element)) {
        this.connectTarget(element, name);
      }
    }
    tokenUnmatched({ element, content: name }) {
      this.disconnectTarget(element, name);
    }
    connectTarget(element, name) {
      var _a;
      if (!this.targetsByName.has(name, element)) {
        this.targetsByName.add(name, element);
        (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetConnected(element, name));
      }
    }
    disconnectTarget(element, name) {
      var _a;
      if (this.targetsByName.has(name, element)) {
        this.targetsByName.delete(name, element);
        (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetDisconnected(element, name));
      }
    }
    disconnectAllTargets() {
      for (const name of this.targetsByName.keys) {
        for (const element of this.targetsByName.getValuesForKey(name)) {
          this.disconnectTarget(element, name);
        }
      }
    }
    get attributeName() {
      return `data-${this.context.identifier}-target`;
    }
    get element() {
      return this.context.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  function readInheritableStaticArrayValues(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return Array.from(ancestors.reduce((values, constructor2) => {
      getOwnStaticArrayValues(constructor2, propertyName).forEach((name) => values.add(name));
      return values;
    }, /* @__PURE__ */ new Set()));
  }
  function readInheritableStaticObjectPairs(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return ancestors.reduce((pairs, constructor2) => {
      pairs.push(...getOwnStaticObjectPairs(constructor2, propertyName));
      return pairs;
    }, []);
  }
  function getAncestorsForConstructor(constructor) {
    const ancestors = [];
    while (constructor) {
      ancestors.push(constructor);
      constructor = Object.getPrototypeOf(constructor);
    }
    return ancestors.reverse();
  }
  function getOwnStaticArrayValues(constructor, propertyName) {
    const definition = constructor[propertyName];
    return Array.isArray(definition) ? definition : [];
  }
  function getOwnStaticObjectPairs(constructor, propertyName) {
    const definition = constructor[propertyName];
    return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
  }
  var OutletObserver = class {
    constructor(context, delegate) {
      this.context = context;
      this.delegate = delegate;
      this.outletsByName = new Multimap();
      this.outletElementsByName = new Multimap();
      this.selectorObserverMap = /* @__PURE__ */ new Map();
    }
    start() {
      if (this.selectorObserverMap.size === 0) {
        this.outletDefinitions.forEach((outletName) => {
          const selector = this.selector(outletName);
          const details = { outletName };
          if (selector) {
            this.selectorObserverMap.set(outletName, new SelectorObserver(document.body, selector, this, details));
          }
        });
        this.selectorObserverMap.forEach((observer) => observer.start());
      }
      this.dependentContexts.forEach((context) => context.refresh());
    }
    stop() {
      if (this.selectorObserverMap.size > 0) {
        this.disconnectAllOutlets();
        this.selectorObserverMap.forEach((observer) => observer.stop());
        this.selectorObserverMap.clear();
      }
    }
    refresh() {
      this.selectorObserverMap.forEach((observer) => observer.refresh());
    }
    selectorMatched(element, _selector, { outletName }) {
      const outlet = this.getOutlet(element, outletName);
      if (outlet) {
        this.connectOutlet(outlet, element, outletName);
      }
    }
    selectorUnmatched(element, _selector, { outletName }) {
      const outlet = this.getOutletFromMap(element, outletName);
      if (outlet) {
        this.disconnectOutlet(outlet, element, outletName);
      }
    }
    selectorMatchElement(element, { outletName }) {
      return this.hasOutlet(element, outletName) && element.matches(`[${this.context.application.schema.controllerAttribute}~=${outletName}]`);
    }
    connectOutlet(outlet, element, outletName) {
      var _a;
      if (!this.outletElementsByName.has(outletName, element)) {
        this.outletsByName.add(outletName, outlet);
        this.outletElementsByName.add(outletName, element);
        (_a = this.selectorObserverMap.get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletConnected(outlet, element, outletName));
      }
    }
    disconnectOutlet(outlet, element, outletName) {
      var _a;
      if (this.outletElementsByName.has(outletName, element)) {
        this.outletsByName.delete(outletName, outlet);
        this.outletElementsByName.delete(outletName, element);
        (_a = this.selectorObserverMap.get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletDisconnected(outlet, element, outletName));
      }
    }
    disconnectAllOutlets() {
      for (const outletName of this.outletElementsByName.keys) {
        for (const element of this.outletElementsByName.getValuesForKey(outletName)) {
          for (const outlet of this.outletsByName.getValuesForKey(outletName)) {
            this.disconnectOutlet(outlet, element, outletName);
          }
        }
      }
    }
    selector(outletName) {
      return this.scope.outlets.getSelectorForOutletName(outletName);
    }
    get outletDependencies() {
      const dependencies = new Multimap();
      this.router.modules.forEach((module) => {
        const constructor = module.definition.controllerConstructor;
        const outlets = readInheritableStaticArrayValues(constructor, "outlets");
        outlets.forEach((outlet) => dependencies.add(outlet, module.identifier));
      });
      return dependencies;
    }
    get outletDefinitions() {
      return this.outletDependencies.getKeysForValue(this.identifier);
    }
    get dependentControllerIdentifiers() {
      return this.outletDependencies.getValuesForKey(this.identifier);
    }
    get dependentContexts() {
      const identifiers = this.dependentControllerIdentifiers;
      return this.router.contexts.filter((context) => identifiers.includes(context.identifier));
    }
    hasOutlet(element, outletName) {
      return !!this.getOutlet(element, outletName) || !!this.getOutletFromMap(element, outletName);
    }
    getOutlet(element, outletName) {
      return this.application.getControllerForElementAndIdentifier(element, outletName);
    }
    getOutletFromMap(element, outletName) {
      return this.outletsByName.getValuesForKey(outletName).find((outlet) => outlet.element === element);
    }
    get scope() {
      return this.context.scope;
    }
    get identifier() {
      return this.context.identifier;
    }
    get application() {
      return this.context.application;
    }
    get router() {
      return this.application.router;
    }
  };
  var Context = class {
    constructor(module, scope) {
      this.logDebugActivity = (functionName, detail = {}) => {
        const { identifier, controller, element } = this;
        detail = Object.assign({ identifier, controller, element }, detail);
        this.application.logDebugActivity(this.identifier, functionName, detail);
      };
      this.module = module;
      this.scope = scope;
      this.controller = new module.controllerConstructor(this);
      this.bindingObserver = new BindingObserver(this, this.dispatcher);
      this.valueObserver = new ValueObserver(this, this.controller);
      this.targetObserver = new TargetObserver(this, this);
      this.outletObserver = new OutletObserver(this, this);
      try {
        this.controller.initialize();
        this.logDebugActivity("initialize");
      } catch (error2) {
        this.handleError(error2, "initializing controller");
      }
    }
    connect() {
      this.bindingObserver.start();
      this.valueObserver.start();
      this.targetObserver.start();
      this.outletObserver.start();
      try {
        this.controller.connect();
        this.logDebugActivity("connect");
      } catch (error2) {
        this.handleError(error2, "connecting controller");
      }
    }
    refresh() {
      this.outletObserver.refresh();
    }
    disconnect() {
      try {
        this.controller.disconnect();
        this.logDebugActivity("disconnect");
      } catch (error2) {
        this.handleError(error2, "disconnecting controller");
      }
      this.outletObserver.stop();
      this.targetObserver.stop();
      this.valueObserver.stop();
      this.bindingObserver.stop();
    }
    get application() {
      return this.module.application;
    }
    get identifier() {
      return this.module.identifier;
    }
    get schema() {
      return this.application.schema;
    }
    get dispatcher() {
      return this.application.dispatcher;
    }
    get element() {
      return this.scope.element;
    }
    get parentElement() {
      return this.element.parentElement;
    }
    handleError(error2, message, detail = {}) {
      const { identifier, controller, element } = this;
      detail = Object.assign({ identifier, controller, element }, detail);
      this.application.handleError(error2, `Error ${message}`, detail);
    }
    targetConnected(element, name) {
      this.invokeControllerMethod(`${name}TargetConnected`, element);
    }
    targetDisconnected(element, name) {
      this.invokeControllerMethod(`${name}TargetDisconnected`, element);
    }
    outletConnected(outlet, element, name) {
      this.invokeControllerMethod(`${namespaceCamelize(name)}OutletConnected`, outlet, element);
    }
    outletDisconnected(outlet, element, name) {
      this.invokeControllerMethod(`${namespaceCamelize(name)}OutletDisconnected`, outlet, element);
    }
    invokeControllerMethod(methodName, ...args) {
      const controller = this.controller;
      if (typeof controller[methodName] == "function") {
        controller[methodName](...args);
      }
    }
  };
  function bless(constructor) {
    return shadow(constructor, getBlessedProperties(constructor));
  }
  function shadow(constructor, properties) {
    const shadowConstructor = extend2(constructor);
    const shadowProperties = getShadowProperties(constructor.prototype, properties);
    Object.defineProperties(shadowConstructor.prototype, shadowProperties);
    return shadowConstructor;
  }
  function getBlessedProperties(constructor) {
    const blessings = readInheritableStaticArrayValues(constructor, "blessings");
    return blessings.reduce((blessedProperties, blessing) => {
      const properties = blessing(constructor);
      for (const key in properties) {
        const descriptor = blessedProperties[key] || {};
        blessedProperties[key] = Object.assign(descriptor, properties[key]);
      }
      return blessedProperties;
    }, {});
  }
  function getShadowProperties(prototype, properties) {
    return getOwnKeys(properties).reduce((shadowProperties, key) => {
      const descriptor = getShadowedDescriptor(prototype, properties, key);
      if (descriptor) {
        Object.assign(shadowProperties, { [key]: descriptor });
      }
      return shadowProperties;
    }, {});
  }
  function getShadowedDescriptor(prototype, properties, key) {
    const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key);
    const shadowedByValue = shadowingDescriptor && "value" in shadowingDescriptor;
    if (!shadowedByValue) {
      const descriptor = Object.getOwnPropertyDescriptor(properties, key).value;
      if (shadowingDescriptor) {
        descriptor.get = shadowingDescriptor.get || descriptor.get;
        descriptor.set = shadowingDescriptor.set || descriptor.set;
      }
      return descriptor;
    }
  }
  var getOwnKeys = (() => {
    if (typeof Object.getOwnPropertySymbols == "function") {
      return (object) => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)];
    } else {
      return Object.getOwnPropertyNames;
    }
  })();
  var extend2 = (() => {
    function extendWithReflect(constructor) {
      function extended() {
        return Reflect.construct(constructor, arguments, new.target);
      }
      extended.prototype = Object.create(constructor.prototype, {
        constructor: { value: extended }
      });
      Reflect.setPrototypeOf(extended, constructor);
      return extended;
    }
    function testReflectExtension() {
      const a = function() {
        this.a.call(this);
      };
      const b = extendWithReflect(a);
      b.prototype.a = function() {
      };
      return new b();
    }
    try {
      testReflectExtension();
      return extendWithReflect;
    } catch (error2) {
      return (constructor) => class extended extends constructor {
      };
    }
  })();
  function blessDefinition(definition) {
    return {
      identifier: definition.identifier,
      controllerConstructor: bless(definition.controllerConstructor)
    };
  }
  var Module = class {
    constructor(application2, definition) {
      this.application = application2;
      this.definition = blessDefinition(definition);
      this.contextsByScope = /* @__PURE__ */ new WeakMap();
      this.connectedContexts = /* @__PURE__ */ new Set();
    }
    get identifier() {
      return this.definition.identifier;
    }
    get controllerConstructor() {
      return this.definition.controllerConstructor;
    }
    get contexts() {
      return Array.from(this.connectedContexts);
    }
    connectContextForScope(scope) {
      const context = this.fetchContextForScope(scope);
      this.connectedContexts.add(context);
      context.connect();
    }
    disconnectContextForScope(scope) {
      const context = this.contextsByScope.get(scope);
      if (context) {
        this.connectedContexts.delete(context);
        context.disconnect();
      }
    }
    fetchContextForScope(scope) {
      let context = this.contextsByScope.get(scope);
      if (!context) {
        context = new Context(this, scope);
        this.contextsByScope.set(scope, context);
      }
      return context;
    }
  };
  var ClassMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    has(name) {
      return this.data.has(this.getDataKey(name));
    }
    get(name) {
      return this.getAll(name)[0];
    }
    getAll(name) {
      const tokenString = this.data.get(this.getDataKey(name)) || "";
      return tokenize(tokenString);
    }
    getAttributeName(name) {
      return this.data.getAttributeNameForKey(this.getDataKey(name));
    }
    getDataKey(name) {
      return `${name}-class`;
    }
    get data() {
      return this.scope.data;
    }
  };
  var DataMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.getAttribute(name);
    }
    set(key, value) {
      const name = this.getAttributeNameForKey(key);
      this.element.setAttribute(name, value);
      return this.get(key);
    }
    has(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.hasAttribute(name);
    }
    delete(key) {
      if (this.has(key)) {
        const name = this.getAttributeNameForKey(key);
        this.element.removeAttribute(name);
        return true;
      } else {
        return false;
      }
    }
    getAttributeNameForKey(key) {
      return `data-${this.identifier}-${dasherize(key)}`;
    }
  };
  var Guide = class {
    constructor(logger) {
      this.warnedKeysByObject = /* @__PURE__ */ new WeakMap();
      this.logger = logger;
    }
    warn(object, key, message) {
      let warnedKeys = this.warnedKeysByObject.get(object);
      if (!warnedKeys) {
        warnedKeys = /* @__PURE__ */ new Set();
        this.warnedKeysByObject.set(object, warnedKeys);
      }
      if (!warnedKeys.has(key)) {
        warnedKeys.add(key);
        this.logger.warn(message, object);
      }
    }
  };
  function attributeValueContainsToken(attributeName, token) {
    return `[${attributeName}~="${token}"]`;
  }
  var TargetSet = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get schema() {
      return this.scope.schema;
    }
    has(targetName) {
      return this.find(targetName) != null;
    }
    find(...targetNames) {
      return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), void 0);
    }
    findAll(...targetNames) {
      return targetNames.reduce((targets, targetName) => [
        ...targets,
        ...this.findAllTargets(targetName),
        ...this.findAllLegacyTargets(targetName)
      ], []);
    }
    findTarget(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findElement(selector);
    }
    findAllTargets(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findAllElements(selector);
    }
    getSelectorForTargetName(targetName) {
      const attributeName = this.schema.targetAttributeForScope(this.identifier);
      return attributeValueContainsToken(attributeName, targetName);
    }
    findLegacyTarget(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.deprecate(this.scope.findElement(selector), targetName);
    }
    findAllLegacyTargets(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.scope.findAllElements(selector).map((element) => this.deprecate(element, targetName));
    }
    getLegacySelectorForTargetName(targetName) {
      const targetDescriptor = `${this.identifier}.${targetName}`;
      return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor);
    }
    deprecate(element, targetName) {
      if (element) {
        const { identifier } = this;
        const attributeName = this.schema.targetAttribute;
        const revisedAttributeName = this.schema.targetAttributeForScope(identifier);
        this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`);
      }
      return element;
    }
    get guide() {
      return this.scope.guide;
    }
  };
  var OutletSet = class {
    constructor(scope, controllerElement) {
      this.scope = scope;
      this.controllerElement = controllerElement;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get schema() {
      return this.scope.schema;
    }
    has(outletName) {
      return this.find(outletName) != null;
    }
    find(...outletNames) {
      return outletNames.reduce((outlet, outletName) => outlet || this.findOutlet(outletName), void 0);
    }
    findAll(...outletNames) {
      return outletNames.reduce((outlets, outletName) => [...outlets, ...this.findAllOutlets(outletName)], []);
    }
    getSelectorForOutletName(outletName) {
      const attributeName = this.schema.outletAttributeForScope(this.identifier, outletName);
      return this.controllerElement.getAttribute(attributeName);
    }
    findOutlet(outletName) {
      const selector = this.getSelectorForOutletName(outletName);
      if (selector)
        return this.findElement(selector, outletName);
    }
    findAllOutlets(outletName) {
      const selector = this.getSelectorForOutletName(outletName);
      return selector ? this.findAllElements(selector, outletName) : [];
    }
    findElement(selector, outletName) {
      const elements = this.scope.queryElements(selector);
      return elements.filter((element) => this.matchesElement(element, selector, outletName))[0];
    }
    findAllElements(selector, outletName) {
      const elements = this.scope.queryElements(selector);
      return elements.filter((element) => this.matchesElement(element, selector, outletName));
    }
    matchesElement(element, selector, outletName) {
      const controllerAttribute = element.getAttribute(this.scope.schema.controllerAttribute) || "";
      return element.matches(selector) && controllerAttribute.split(" ").includes(outletName);
    }
  };
  var Scope = class {
    constructor(schema, element, identifier, logger) {
      this.targets = new TargetSet(this);
      this.classes = new ClassMap(this);
      this.data = new DataMap(this);
      this.containsElement = (element2) => {
        return element2.closest(this.controllerSelector) === this.element;
      };
      this.schema = schema;
      this.element = element;
      this.identifier = identifier;
      this.guide = new Guide(logger);
      this.outlets = new OutletSet(this.documentScope, element);
    }
    findElement(selector) {
      return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement);
    }
    findAllElements(selector) {
      return [
        ...this.element.matches(selector) ? [this.element] : [],
        ...this.queryElements(selector).filter(this.containsElement)
      ];
    }
    queryElements(selector) {
      return Array.from(this.element.querySelectorAll(selector));
    }
    get controllerSelector() {
      return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier);
    }
    get isDocumentScope() {
      return this.element === document.documentElement;
    }
    get documentScope() {
      return this.isDocumentScope ? this : new Scope(this.schema, document.documentElement, this.identifier, this.guide.logger);
    }
  };
  var ScopeObserver = class {
    constructor(element, schema, delegate) {
      this.element = element;
      this.schema = schema;
      this.delegate = delegate;
      this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this);
      this.scopesByIdentifierByElement = /* @__PURE__ */ new WeakMap();
      this.scopeReferenceCounts = /* @__PURE__ */ new WeakMap();
    }
    start() {
      this.valueListObserver.start();
    }
    stop() {
      this.valueListObserver.stop();
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    parseValueForToken(token) {
      const { element, content: identifier } = token;
      const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element);
      let scope = scopesByIdentifier.get(identifier);
      if (!scope) {
        scope = this.delegate.createScopeForElementAndIdentifier(element, identifier);
        scopesByIdentifier.set(identifier, scope);
      }
      return scope;
    }
    elementMatchedValue(element, value) {
      const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1;
      this.scopeReferenceCounts.set(value, referenceCount);
      if (referenceCount == 1) {
        this.delegate.scopeConnected(value);
      }
    }
    elementUnmatchedValue(element, value) {
      const referenceCount = this.scopeReferenceCounts.get(value);
      if (referenceCount) {
        this.scopeReferenceCounts.set(value, referenceCount - 1);
        if (referenceCount == 1) {
          this.delegate.scopeDisconnected(value);
        }
      }
    }
    fetchScopesByIdentifierForElement(element) {
      let scopesByIdentifier = this.scopesByIdentifierByElement.get(element);
      if (!scopesByIdentifier) {
        scopesByIdentifier = /* @__PURE__ */ new Map();
        this.scopesByIdentifierByElement.set(element, scopesByIdentifier);
      }
      return scopesByIdentifier;
    }
  };
  var Router = class {
    constructor(application2) {
      this.application = application2;
      this.scopeObserver = new ScopeObserver(this.element, this.schema, this);
      this.scopesByIdentifier = new Multimap();
      this.modulesByIdentifier = /* @__PURE__ */ new Map();
    }
    get element() {
      return this.application.element;
    }
    get schema() {
      return this.application.schema;
    }
    get logger() {
      return this.application.logger;
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    get modules() {
      return Array.from(this.modulesByIdentifier.values());
    }
    get contexts() {
      return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), []);
    }
    start() {
      this.scopeObserver.start();
    }
    stop() {
      this.scopeObserver.stop();
    }
    loadDefinition(definition) {
      this.unloadIdentifier(definition.identifier);
      const module = new Module(this.application, definition);
      this.connectModule(module);
      const afterLoad = definition.controllerConstructor.afterLoad;
      if (afterLoad) {
        afterLoad(definition.identifier, this.application);
      }
    }
    unloadIdentifier(identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        this.disconnectModule(module);
      }
    }
    getContextForElementAndIdentifier(element, identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        return module.contexts.find((context) => context.element == element);
      }
    }
    handleError(error2, message, detail) {
      this.application.handleError(error2, message, detail);
    }
    createScopeForElementAndIdentifier(element, identifier) {
      return new Scope(this.schema, element, identifier, this.logger);
    }
    scopeConnected(scope) {
      this.scopesByIdentifier.add(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.connectContextForScope(scope);
      }
    }
    scopeDisconnected(scope) {
      this.scopesByIdentifier.delete(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.disconnectContextForScope(scope);
      }
    }
    connectModule(module) {
      this.modulesByIdentifier.set(module.identifier, module);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.connectContextForScope(scope));
    }
    disconnectModule(module) {
      this.modulesByIdentifier.delete(module.identifier);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.disconnectContextForScope(scope));
    }
  };
  var defaultSchema = {
    controllerAttribute: "data-controller",
    actionAttribute: "data-action",
    targetAttribute: "data-target",
    targetAttributeForScope: (identifier) => `data-${identifier}-target`,
    outletAttributeForScope: (identifier, outlet) => `data-${identifier}-${outlet}-outlet`,
    keyMappings: Object.assign(Object.assign({ enter: "Enter", tab: "Tab", esc: "Escape", space: " ", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", home: "Home", end: "End" }, objectFromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c) => [c, c]))), objectFromEntries("0123456789".split("").map((n) => [n, n])))
  };
  function objectFromEntries(array) {
    return array.reduce((memo, [k, v]) => Object.assign(Object.assign({}, memo), { [k]: v }), {});
  }
  var Application = class {
    constructor(element = document.documentElement, schema = defaultSchema) {
      this.logger = console;
      this.debug = false;
      this.logDebugActivity = (identifier, functionName, detail = {}) => {
        if (this.debug) {
          this.logFormattedMessage(identifier, functionName, detail);
        }
      };
      this.element = element;
      this.schema = schema;
      this.dispatcher = new Dispatcher(this);
      this.router = new Router(this);
      this.actionDescriptorFilters = Object.assign({}, defaultActionDescriptorFilters);
    }
    static start(element, schema) {
      const application2 = new this(element, schema);
      application2.start();
      return application2;
    }
    async start() {
      await domReady();
      this.logDebugActivity("application", "starting");
      this.dispatcher.start();
      this.router.start();
      this.logDebugActivity("application", "start");
    }
    stop() {
      this.logDebugActivity("application", "stopping");
      this.dispatcher.stop();
      this.router.stop();
      this.logDebugActivity("application", "stop");
    }
    register(identifier, controllerConstructor) {
      this.load({ identifier, controllerConstructor });
    }
    registerActionOption(name, filter) {
      this.actionDescriptorFilters[name] = filter;
    }
    load(head, ...rest) {
      const definitions = Array.isArray(head) ? head : [head, ...rest];
      definitions.forEach((definition) => {
        if (definition.controllerConstructor.shouldLoad) {
          this.router.loadDefinition(definition);
        }
      });
    }
    unload(head, ...rest) {
      const identifiers = Array.isArray(head) ? head : [head, ...rest];
      identifiers.forEach((identifier) => this.router.unloadIdentifier(identifier));
    }
    get controllers() {
      return this.router.contexts.map((context) => context.controller);
    }
    getControllerForElementAndIdentifier(element, identifier) {
      const context = this.router.getContextForElementAndIdentifier(element, identifier);
      return context ? context.controller : null;
    }
    handleError(error2, message, detail) {
      var _a;
      this.logger.error(`%s

%o

%o`, message, error2, detail);
      (_a = window.onerror) === null || _a === void 0 ? void 0 : _a.call(window, message, "", 0, 0, error2);
    }
    logFormattedMessage(identifier, functionName, detail = {}) {
      detail = Object.assign({ application: this }, detail);
      this.logger.groupCollapsed(`${identifier} #${functionName}`);
      this.logger.log("details:", Object.assign({}, detail));
      this.logger.groupEnd();
    }
  };
  function domReady() {
    return new Promise((resolve) => {
      if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", () => resolve());
      } else {
        resolve();
      }
    });
  }
  function ClassPropertiesBlessing(constructor) {
    const classes = readInheritableStaticArrayValues(constructor, "classes");
    return classes.reduce((properties, classDefinition) => {
      return Object.assign(properties, propertiesForClassDefinition(classDefinition));
    }, {});
  }
  function propertiesForClassDefinition(key) {
    return {
      [`${key}Class`]: {
        get() {
          const { classes } = this;
          if (classes.has(key)) {
            return classes.get(key);
          } else {
            const attribute = classes.getAttributeName(key);
            throw new Error(`Missing attribute "${attribute}"`);
          }
        }
      },
      [`${key}Classes`]: {
        get() {
          return this.classes.getAll(key);
        }
      },
      [`has${capitalize(key)}Class`]: {
        get() {
          return this.classes.has(key);
        }
      }
    };
  }
  function OutletPropertiesBlessing(constructor) {
    const outlets = readInheritableStaticArrayValues(constructor, "outlets");
    return outlets.reduce((properties, outletDefinition) => {
      return Object.assign(properties, propertiesForOutletDefinition(outletDefinition));
    }, {});
  }
  function propertiesForOutletDefinition(name) {
    const camelizedName = namespaceCamelize(name);
    return {
      [`${camelizedName}Outlet`]: {
        get() {
          const outlet = this.outlets.find(name);
          if (outlet) {
            const outletController = this.application.getControllerForElementAndIdentifier(outlet, name);
            if (outletController) {
              return outletController;
            } else {
              throw new Error(`Missing "data-controller=${name}" attribute on outlet element for "${this.identifier}" controller`);
            }
          }
          throw new Error(`Missing outlet element "${name}" for "${this.identifier}" controller`);
        }
      },
      [`${camelizedName}Outlets`]: {
        get() {
          const outlets = this.outlets.findAll(name);
          if (outlets.length > 0) {
            return outlets.map((outlet) => {
              const controller = this.application.getControllerForElementAndIdentifier(outlet, name);
              if (controller) {
                return controller;
              } else {
                console.warn(`The provided outlet element is missing the outlet controller "${name}" for "${this.identifier}"`, outlet);
              }
            }).filter((controller) => controller);
          }
          return [];
        }
      },
      [`${camelizedName}OutletElement`]: {
        get() {
          const outlet = this.outlets.find(name);
          if (outlet) {
            return outlet;
          } else {
            throw new Error(`Missing outlet element "${name}" for "${this.identifier}" controller`);
          }
        }
      },
      [`${camelizedName}OutletElements`]: {
        get() {
          return this.outlets.findAll(name);
        }
      },
      [`has${capitalize(camelizedName)}Outlet`]: {
        get() {
          return this.outlets.has(name);
        }
      }
    };
  }
  function TargetPropertiesBlessing(constructor) {
    const targets = readInheritableStaticArrayValues(constructor, "targets");
    return targets.reduce((properties, targetDefinition) => {
      return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
    }, {});
  }
  function propertiesForTargetDefinition(name) {
    return {
      [`${name}Target`]: {
        get() {
          const target = this.targets.find(name);
          if (target) {
            return target;
          } else {
            throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
          }
        }
      },
      [`${name}Targets`]: {
        get() {
          return this.targets.findAll(name);
        }
      },
      [`has${capitalize(name)}Target`]: {
        get() {
          return this.targets.has(name);
        }
      }
    };
  }
  function ValuePropertiesBlessing(constructor) {
    const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
    const propertyDescriptorMap = {
      valueDescriptorMap: {
        get() {
          return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
            const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier);
            const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
            return Object.assign(result, { [attributeName]: valueDescriptor });
          }, {});
        }
      }
    };
    return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
      return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
    }, propertyDescriptorMap);
  }
  function propertiesForValueDefinitionPair(valueDefinitionPair, controller) {
    const definition = parseValueDefinitionPair(valueDefinitionPair, controller);
    const { key, name, reader: read, writer: write } = definition;
    return {
      [name]: {
        get() {
          const value = this.data.get(key);
          if (value !== null) {
            return read(value);
          } else {
            return definition.defaultValue;
          }
        },
        set(value) {
          if (value === void 0) {
            this.data.delete(key);
          } else {
            this.data.set(key, write(value));
          }
        }
      },
      [`has${capitalize(name)}`]: {
        get() {
          return this.data.has(key) || definition.hasCustomDefaultValue;
        }
      }
    };
  }
  function parseValueDefinitionPair([token, typeDefinition], controller) {
    return valueDescriptorForTokenAndTypeDefinition({
      controller,
      token,
      typeDefinition
    });
  }
  function parseValueTypeConstant(constant) {
    switch (constant) {
      case Array:
        return "array";
      case Boolean:
        return "boolean";
      case Number:
        return "number";
      case Object:
        return "object";
      case String:
        return "string";
    }
  }
  function parseValueTypeDefault(defaultValue) {
    switch (typeof defaultValue) {
      case "boolean":
        return "boolean";
      case "number":
        return "number";
      case "string":
        return "string";
    }
    if (Array.isArray(defaultValue))
      return "array";
    if (Object.prototype.toString.call(defaultValue) === "[object Object]")
      return "object";
  }
  function parseValueTypeObject(payload) {
    const typeFromObject = parseValueTypeConstant(payload.typeObject.type);
    if (!typeFromObject)
      return;
    const defaultValueType = parseValueTypeDefault(payload.typeObject.default);
    if (typeFromObject !== defaultValueType) {
      const propertyPath = payload.controller ? `${payload.controller}.${payload.token}` : payload.token;
      throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${payload.typeObject.default}" is of type "${defaultValueType}".`);
    }
    return typeFromObject;
  }
  function parseValueTypeDefinition(payload) {
    const typeFromObject = parseValueTypeObject({
      controller: payload.controller,
      token: payload.token,
      typeObject: payload.typeDefinition
    });
    const typeFromDefaultValue = parseValueTypeDefault(payload.typeDefinition);
    const typeFromConstant = parseValueTypeConstant(payload.typeDefinition);
    const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
    if (type)
      return type;
    const propertyPath = payload.controller ? `${payload.controller}.${payload.typeDefinition}` : payload.token;
    throw new Error(`Unknown value type "${propertyPath}" for "${payload.token}" value`);
  }
  function defaultValueForDefinition(typeDefinition) {
    const constant = parseValueTypeConstant(typeDefinition);
    if (constant)
      return defaultValuesByType[constant];
    const defaultValue = typeDefinition.default;
    if (defaultValue !== void 0)
      return defaultValue;
    return typeDefinition;
  }
  function valueDescriptorForTokenAndTypeDefinition(payload) {
    const key = `${dasherize(payload.token)}-value`;
    const type = parseValueTypeDefinition(payload);
    return {
      type,
      key,
      name: camelize(key),
      get defaultValue() {
        return defaultValueForDefinition(payload.typeDefinition);
      },
      get hasCustomDefaultValue() {
        return parseValueTypeDefault(payload.typeDefinition) !== void 0;
      },
      reader: readers[type],
      writer: writers[type] || writers.default
    };
  }
  var defaultValuesByType = {
    get array() {
      return [];
    },
    boolean: false,
    number: 0,
    get object() {
      return {};
    },
    string: ""
  };
  var readers = {
    array(value) {
      const array = JSON.parse(value);
      if (!Array.isArray(array)) {
        throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`);
      }
      return array;
    },
    boolean(value) {
      return !(value == "0" || String(value).toLowerCase() == "false");
    },
    number(value) {
      return Number(value);
    },
    object(value) {
      const object = JSON.parse(value);
      if (object === null || typeof object != "object" || Array.isArray(object)) {
        throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object)}"`);
      }
      return object;
    },
    string(value) {
      return value;
    }
  };
  var writers = {
    default: writeString,
    array: writeJSON,
    object: writeJSON
  };
  function writeJSON(value) {
    return JSON.stringify(value);
  }
  function writeString(value) {
    return `${value}`;
  }
  var Controller = class {
    constructor(context) {
      this.context = context;
    }
    static get shouldLoad() {
      return true;
    }
    static afterLoad(_identifier, _application) {
      return;
    }
    get application() {
      return this.context.application;
    }
    get scope() {
      return this.context.scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get targets() {
      return this.scope.targets;
    }
    get outlets() {
      return this.scope.outlets;
    }
    get classes() {
      return this.scope.classes;
    }
    get data() {
      return this.scope.data;
    }
    initialize() {
    }
    connect() {
    }
    disconnect() {
    }
    dispatch(eventName, { target = this.element, detail = {}, prefix = this.identifier, bubbles = true, cancelable = true } = {}) {
      const type = prefix ? `${prefix}:${eventName}` : eventName;
      const event = new CustomEvent(type, { detail, bubbles, cancelable });
      target.dispatchEvent(event);
      return event;
    }
  };
  Controller.blessings = [
    ClassPropertiesBlessing,
    TargetPropertiesBlessing,
    ValuePropertiesBlessing,
    OutletPropertiesBlessing
  ];
  Controller.targets = [];
  Controller.outlets = [];
  Controller.values = {};

  // app/javascript/controllers/admin/dashboard_controller.js
  var dashboard_controller_default = class extends Controller {
    connect() {
      console.log("Dashboard controller");
    }
  };

  // app/javascript/controllers/admin/flash_message_controller.js
  var flash_message_controller_default = class extends Controller {
    connect() {
      new bootstrap.Toast(this.element).show();
    }
  };

  // app/javascript/controllers/admin/index.js
  var application = Application.start();
  application.register("home", dashboard_controller_default);
  application.register("flash-message", flash_message_controller_default);

  // app/javascript/admin.js
  turbo_es2017_esm_exports.start();
})();
/*!
* Tabler v1.0.0-beta5 (https://tabler.io)
* @version 1.0.0-beta5
* @link https://tabler.io
* Copyright 2018-2022 The Tabler Authors
* Copyright 2018-2022 codecalm.net Paweł Kuna
* Licensed under MIT (https://github.com/tabler/tabler/blob/master/LICENSE)
*/
//# sourceMappingURL=assets/admin.js.map
