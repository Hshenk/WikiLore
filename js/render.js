
export function clearElement(el) {
    el.replaceChildren();
}

/** Render one article into container */
export function renderArticle(article, container) {
    clearElement(container);

    const root = document.createElement("article");
    root.className = "article";

    const title = document.createElement("h1");
    title.className = "article-title";
    title.textContent = article.title;
    root.append(title);

    for (const section of article.sections) {
        root.append(renderSection(section));
    }

    container.append(root);
}

function renderSection(section) {
    const wrap = document.createElement("section");
    wrap.className = "article-section";

    if (section.heading) {
        const h = document.createElement("h2");
        h.className = "section-heading";
        h.textContent = section.heading;
        wrap.append(h);
    }

    for (const text of section.body.split("\n\n")) {
        const p = document.createElement("p");
        p.textContent = text;
        wrap.append(p);
    }

    return wrap;
}

/** Renders the homepage: A heading plus one linker per visible article */
export function renderIndex(articles, container) {
    clearElement(container);

    const heading = document.createElement("h1");
    heading.className = "index-heading";
    heading.textContent = "Articles";
    container.append(heading);

    const list = document.createElement("ul");
    list.className = "article-index";

    for (const article of articles) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.className = "index-link";
        link.href = "#/" + article.slug;

        const title = document.createElement("span");
        title.className = "index-link__title";
        title.textContent = article.title;
        link.append(title);

        if (article.category) {
            const category = document.createElement("span");
            category.className = "index-link__category";
            category.textContent = article.category;
            link.append(category);
        }

        item.append(link);
        list.append(item);
    }

    container.append(list);
}


/** Replace the content area with a notice box */
export function renderNotice(message, container, isError) {
    clearElement(container);
    const box = document.createElement("p");
    box.className = isError ? "notice notice--error" : "notice";
    box.textContent = message;
    container.append(box);
}