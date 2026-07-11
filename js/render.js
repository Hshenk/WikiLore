import { marked } from "https://esm.sh/marked@12";



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

    if (gm) {
        const edit = document.createElement("a");
        edit.className = "back-link article-edit";
        edit.href = "#/_edit/" + article.slug;
        edit.textContent = "Edit ✎";
        root.append(edit);
    }

    const title = document.createElement("h1");
    title.className = "article-title";
    title.textContent = article.title;
    if (article.visible === false) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "hidden";
        title.append(badge);
    }
    root.append(title);

    for (const section of article.sections) {
        root.append(renderSection(section, linkTargets));
    }

    container.append(root);
}

function renderSection(section, linkTargets) {
    const wrap = document.createElement("section");
    wrap.className = "article-section";

    if (section.hidden) {
        wrap.classList.add("section--hidden");
    }

    if (section.heading) {
        const h = document.createElement("h2");
        h.className = "section-heading";
        h.textContent = section.heading;
        wrap.append(h);
    }

    // The one sactioned innerHTML: GM-authored only
    // When players write articles later, will need to be sanitized (DOMPurify)
    const body = document.createElement("div");
    body.className = "section-body";
    body.innerHTML = marked.parse(resolveWikiLinks(section.body, linkTargets));
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
            title.textContent = article.title;
            link.append(title);

            if (article.visible === false) {
                const badge = document.createElement("span");
                badge.className = "badge";
                badge.textContent = "hidden";
                title.append(badge);
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