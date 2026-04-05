/**
 * Minimal helper for partners: open hosted checkout in a popup or iframe.
 * Serve from your deployed Next origin, e.g. https://billing.example.com/billing-checkout.js
 *
 * Usage: see docs/DEVELOPER_INTEGRATION.md
 */
(function (global) {
  "use strict";

  /**
   * @typedef {Object} OpenPopupOptions
   * @property {string} baseUrl - Frontend origin, no trailing slash (e.g. https://app.example.com)
   * @property {string} slug - Payment page slug
   * @property {string} [email]
   * @property {string} [name]
   * @property {boolean} [embed=true] - Append embed=1 for postMessage on success
   * @property {number} [width]
   * @property {number} [height]
   */

  /**
   * @param {OpenPopupOptions} options
   */
  function openPopup(options) {
    if (!options || !options.slug) {
      throw new Error("BillingCheckout.openPopup: slug is required");
    }
    var base = (options.baseUrl || "").replace(/\/$/, "");
    if (!base && typeof location !== "undefined") {
      base = location.origin;
    }
    var qs = new URLSearchParams();
    if (options.email) qs.set("email", options.email);
    if (options.name) qs.set("name", options.name);
    if (options.embed !== false) qs.set("embed", "1");
    var q = qs.toString();
    var url =
      base +
      "/pay/" +
      encodeURIComponent(options.slug) +
      (q ? "?" + q : "");
    var w = options.width || 480;
    var h = options.height || 720;
    var left = Math.max(0, (screen.width - w) / 2);
    var top = Math.max(0, (screen.height - h) / 2);
    var features =
      "width=" +
      w +
      ",height=" +
      h +
      ",left=" +
      left +
      ",top=" +
      top +
      ",scrollbars=yes,resizable=yes";
    global.open(url, "billing_checkout", features);
  }

  /**
   * @param {HTMLElement} el
   * @param {OpenPopupOptions} options
   */
  function mountIframe(el, options) {
    if (!el || !options || !options.slug) {
      throw new Error("BillingCheckout.mountIframe: container and slug required");
    }
    var base = (options.baseUrl || "").replace(/\/$/, "");
    if (!base && typeof location !== "undefined") {
      base = location.origin;
    }
    var qs = new URLSearchParams();
    if (options.email) qs.set("email", options.email);
    if (options.name) qs.set("name", options.name);
    if (options.embed !== false) qs.set("embed", "1");
    var q = qs.toString();
    var url =
      base +
      "/pay/" +
      encodeURIComponent(options.slug) +
      (q ? "?" + q : "");
    el.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = "Checkout";
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.minHeight = (options.height || 720) + "px";
    el.appendChild(iframe);
  }

  global.BillingCheckout = {
    openPopup: openPopup,
    mountIframe: mountIframe,
  };
})(typeof window !== "undefined" ? window : this);
