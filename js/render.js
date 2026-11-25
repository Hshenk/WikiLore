import { marked } from "https://esm.sh/marked@12";
import DOMPurify from "https://esm.sh/dompurify@3";
import { MAP_URL } from "./config.js";


export function clearElement(el) {
    el.replaceChildren();
}

/** Render one article into container */
export function renderArticle(article, container, linkTargets, gm) {
    clearElement(container);

    const root = document.createElement("article");
    root.className = "article";

    const back = document.createElement("a");
    back.className = "back-link";
    back.href = "#/";
    back.textContent = "← All articles";
    root.append(back);

    if (gm || article.mine) {
        const edit = document.createElement("a");
        edit.className = "back-link article-edit";
        edit.href = "#/_edit/" + article.slug;
        edit.textContent = "Edit ✎";
        root.append(edit);
    }

    if (article.location_id) {
        const mapLink = document.createElement("a");
        mapLink.className = "back-link article-map-link";
        mapLink.href = MAP_URL + "#marker=" + article.location_id;
        mapLink.target = "_blank";
        mapLink.rel = "noopener";
        mapLink.textContent = "Show on map";
        root.append(mapLink);
    }

    const title = document.createElement("h1");
    title.className = "article-title";
    const titleText = document.createElement("span");
    titleText.textContent = article.title;
    applyGlitch(titleText, article.glitch || 0);
    title.append(titleText);

    if (article.visible === false) {
        const badge = document.createElement("span");
        badge.className = article.author_name ? "badge badge--private" : "badge";
        badge.textContent = article.author_name ? "private" : "hidden";
        title.append(badge);
    }
    root.append(title);

    if (article.author_name) {
        const byline = document.createElement("p");
        byline.className = "article-byline";
        byline.textContent = "by " + article.author_name;
        root.append(byline);
    }

    for (const section of article.sections) {
        root.append(renderSection(section, linkTargets, article.glitch || 0));
    }

    container.append(root);
}

function renderSection(section, linkTargets, articleGlitch) {
    const wrap = document.createElement("section");
    wrap.className = "article-section";

    if (section.hidden) {
        wrap.classList.add("section--hidden");
    }
    
    // An article-wide glitch is a floor: a section may be worse, never better.
    applyGlitch(wrap, Math.max(articleGlitch || 0, section.glitch || 0));


    if (section.heading) {
        const h = document.createElement("h2");
        h.className = "section-heading";
        h.textContent = section.heading;
        wrap.append(h);
    }


    const body = document.createElement("div");
    body.className = "section-body";
    body.innerHTML = DOMPurify.sanitize(
        marked.parse(resolveGlitch(resolveWikiLinks(section.body, linkTargets))));
    wrap.append(body);

    return wrap;
}

/** Renders the homepage: A heading plus one linker per visible article */
export function renderIndex(articles, container, gm) {
    clearElement(container);

    const heading = document.createElement("h1");
    heading.className = "index-heading";
    heading.textContent = "Articles";
    container.append(heading);

    if (gm) {
        const newLink = document.createElement("a");
        newLink.className = "btn index-new";
        newLink.href = "#/_new";
        newLink.textContent = "+ New article";
        container.append(newLink);
    }

    const lore = articles.filter((article) => !article.author_name);
    const notes = articles.filter((article) => article.author_name);

    renderGroups(lore, container);

    if (notes.length > 0) {
        const playerHeading = document.createElement("h1");
        playerHeading.className = "index-heading index-heading--player";
        playerHeading.textContent = "Player Articles";
        container.append(playerHeading);
        renderGroups(notes, container);
    }
}


function renderGroups(articles, container) {
    const groups = new Map();
    for (const article of articles) {
        const category = article.category || "Uncategorized";
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category).push(article);
    }

    for (const category of [...groups.keys()].sort()) {
        const catHeading = document.createElement("h2");
        catHeading.className = "index-category-heading";
        catHeading.textContent = category;
        container.append(catHeading);

        const list = document.createElement("ul");
        list.className = "article-index";

        for (const article of groups.get(category)) {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.className = "index-link";
            link.href = "#/" + article.slug;

            const title = document.createElement("span");
            title.className = "index-link__title";
            const titleText = document.createElement("span");
            titleText.textContent = article.title;
            if (article.glitch > 0) {
                // One level weaker in the list, but never silent.
                applyGlitch(titleText, Math.max(1, article.glitch - 1));
            }
            title.append(titleText);
            link.append(title);

            if (article.visible === false) {
                const badge = document.createElement("span");
                badge.className = article.author_name ? "badge badge--private" : "badge";
                badge.textContent = article.author_name ? "private" : "hidden";
                title.append(badge);
            }

            if (article.author_name) {
                const author = document.createElement("span");
                author.className = "index-link__author";
                author.textContent = "by " + article.author_name;
                link.append(author);
            }

            item.append(link)
            list.append(item)
        }

        container.append(list);
    }
}



/** Replace the content area with a notice box */
export function renderNotice(message, container, isError) {
    clearElement(container);
    const box = document.createElement("p");
    box.className = isError ? "notice notice--error" : "notice";
    box.textContent = message;
    container.append(box);
}

/**
 * [[Article Title]] / [[Article Title | shown text]] -> markdown links, but
 * only when the target is in the visible list. Anything else becomes plain prose.
 */
function resolveWikiLinks(body, linkTargets) {
    return body.replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (match, target, display) => {
        const slug = linkTargets.get(target.trim().toLowerCase());
        const text = (display || target).trim();
        if (!slug) {
            return text;
        }
        return "[" + text + "](#/" + slug + ")";
    });
}

/**
 * %%text%% / %%%text%%% / %%%%text%%%% -> a glitch span, level 1 / 2 / 3.
 */
function resolveGlitch(body) {
    return body.replace(/(%{2,4})(.+?)\1/g, (match, marks, text) =>
        '<span class="glitch glitch--' + (marks.length - 1) + '">' + text + "</span>");
}

/** Tag an element with a glitch level. Level 0 does nothing. */
function applyGlitch(el, level) {
    if (level > 0) {
        el.classList.add("glitch", "glitch--" + level);
    }
}
