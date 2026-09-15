import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "默默背单词",
    description:
      "划词收藏后，之后读英文网页时会高亮这些词。看见自己的词再次出现，比把单词丢进词表更有用。",
    icons: {
      16: "/icon/16.png",
      32: "/icon/32.png",
      48: "/icon/48.png",
      128: "/icon/128.png",
    },
    permissions: ["storage", "alarms", "notifications"],
    host_permissions: [
      "http://*/*",
      "https://*/*",
      "https://api.dictionaryapi.dev/*",
    ],
  },
});
