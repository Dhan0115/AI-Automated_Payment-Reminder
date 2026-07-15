import { _ as __nuxt_component_0 } from './nuxt-link-6CJ8MLxN.mjs';
import { _ as _export_sfc, a as __nuxt_component_1 } from './server.mjs';
import { mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent } from 'vue/server-renderer';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'vue-router';
import '@iconify/vue';
import 'tailwindcss/colors';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

const _sfc_main = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  const _component_NuxtLink = __nuxt_component_0;
  const _component_NuxtPage = __nuxt_component_1;
  _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-screen bg-gray-50 text-gray-900" }, _attrs))}><header class="border-b bg-white"><div class="max-w-4xl mx-auto flex items-center justify-between px-4 py-3"><h1 class="text-xl font-semibold">My Bill Reminder</h1><nav class="flex gap-4 text-sm">`);
  _push(ssrRenderComponent(_component_NuxtLink, {
    to: "/",
    class: "hover:text-indigo-600"
  }, {
    default: withCtx((_, _push2, _parent2, _scopeId) => {
      if (_push2) {
        _push2(`Bills`);
      } else {
        return [
          createTextVNode("Bills")
        ];
      }
    }),
    _: 1
  }, _parent));
  _push(`</nav></div></header><main class="max-w-4xl mx-auto px-4 py-6">`);
  _push(ssrRenderComponent(_component_NuxtPage, null, null, _parent));
  _push(`</main></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/app.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const app = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);

export { app as default };
//# sourceMappingURL=app-DebrRic_.mjs.map
