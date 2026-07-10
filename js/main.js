import { SITE_TITLE } from "./config.js";
import { renderIndex, renderNotice } from "./render.js";
import { initLive, fetchArticleList } from "./live.js";


async function boot() {
    document.title = SITE_TITLE;
    const content = document.querySelector("#content");

    initLive();

    try {
        const articles = await fetchArticleList();
        renderIndex(articles, content);
    } catch (err) {
        renderNotice(err.message, content, true);
    }
}

boot();