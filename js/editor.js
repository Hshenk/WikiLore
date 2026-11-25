/**
 * The in-browser article editor.
 */

import { clearElement, renderNotice } from "./render.js";
import { fetchArticle, createArticle, updateArticle, replaceSections, deleteArticle,
         gmActive, getUserId } from "./live.js";

// Static skeletons ONLY — never interpolate article data into these.
const EDITOR_HTML = `
    <a class="back-link" href="#/">← All articles</a>
    <h1 class="editor-title"></h1>
    <div class="editor-meta">
        <label class="ed-field">Title
            <input id="ed-title"></label>
        <label class="ed-field">Slug (the URL name)
            <input id="ed-slug" placeholder="left blank = made from the title"></label>
        <label class="ed-field">Category
            <input id="ed-category"></label>
        <label class="ed-field" id="ed-location-field">Map location id
            <input id="ed-location" placeholder="burg7, poi3, …"></label>
        <label class="ed-field" id="ed-glitch-field">Glitch
            <select id="ed-glitch" class="ed-glitch">
                <option value="0">None</option>
                <option value="1">1 - faint</option>
                <option value="2">2 - unstable</option>
                <option value="3">3 - collapsing</option>
            </select></label>

        <label class="ed-check">
            <input type="checkbox" id="ed-visible">
            <span id="ed-visible-label">Visible to players</span></label>
    </div>
    <div id="ed-sections"></div>
    <div class="editor-actions">
        <button id="ed-add-section" type="button" class="btn">+ Add section</button>
        <button id="ed-save" type="button" class="btn btn--primary">Save</button>
        <button id="ed-delete" type="button" class="btn btn--danger">Delete article</button>
        <p id="ed-status" class="editor-status"></p>
    </div>
`;

const SECTION_HTML = `
    <div class="ed-section-head">
        <input class="ed-heading" placeholder="Section heading (optional)">
        <label class="ed-check">
            <input type="checkbox" class="ed-hidden"> Hidden</label>
        <select class="ed-glitch">
            <option value="0">No glitch</option>
            <option value="1">Glitch 1</option>
            <option value="2">Glitch 2</option>
            <option value="3">Glitch 3</option>
        </select>
        <button type="button" class="btn ed-up" title="Move up">↑</button>
        <button type="button" class="btn ed-down" title="Move down">↓</button>
        <button type="button" class="btn btn--danger ed-remove" title="Remove">✕</button>
    </div>
    <textarea class="ed-body" rows="8"
        placeholder="Markdown. [[Article Title]] makes a wiki-link."></textarea>
`;

function buildSectionRow(section) {
    const row = document.createElement("div");
    row.className = "ed-section";
    row.innerHTML = SECTION_HTML;

    row.querySelector(".ed-heading").value = section.heading;
    row.querySelector(".ed-body").value = section.body;
    row.querySelector(".ed-hidden").checked = section.hidden;

    row.querySelector(".ed-glitch").value = section.glitch || 0;


    row.querySelector(".ed-remove").addEventListener("click", () => {
        row.remove();
    });
    row.querySelector(".ed-up").addEventListener("click", () => {
        if (row.previousElementSibling) {
            row.parentElement.insertBefore(row, row.previousElementSibling);
        }
    });
    row.querySelector(".ed-down").addEventListener("click", () => {
        if (row.nextElementSibling) {
            row.parentElement.insertBefore(row.nextElementSibling, row);
        }
    });

    return row;
}

function slugify(text) {
    return text.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s-]+/g, "-");
}

function collectForm() {
    const sections = [...document.querySelectorAll(".ed-section")].map((row) => ({
        heading: row.querySelector(".ed-heading").value.trim(),
        body: row.querySelector(".ed-body").value,
        hidden: row.querySelector(".ed-hidden").checked,
        glitch: Number(row.querySelector(".ed-glitch").value),
    }));

    return {
        meta: {
            title: document.querySelector("#ed-title").value.trim(),
            slug: document.querySelector("#ed-slug").value.trim(),
            category: document.querySelector("#ed-category").value.trim(),
            location_id: document.querySelector("#ed-location").value.trim() || null,
            visible: document.querySelector("#ed-visible").checked,
            glitch: Number(document.querySelector("#ed-glitch").value),
        },
        sections: sections,
    }; 
}


export async function openEditor(slug, container, onSaved) {
    let article = null;
    if (slug) {
        article = await fetchArticle(slug);
        if (!article) {
            renderNotice("No article with slug '" + slug + "'.", container, true);
            return;
        }

        if (!gmActive() && !article.mine) {
            renderNotice("Only this article's author and the GM can edit it.",
                container, true);
            return;
        }
    }

    clearElement(container);
    const root = document.createElement("div");
    root.className = "editor";
    root.innerHTML = EDITOR_HTML;
    container.append(root);

    root.querySelector(".editor-title").textContent = 
        article ? "Edit article" : "New article";
    
    const sectionsBox = root.querySelector("#ed-sections");
    if (article) {
        root.querySelector("#ed-title").value = article.title;
        root.querySelector("#ed-slug").value = article.slug;
        root.querySelector("#ed-category").value = article.category;
        root.querySelector("#ed-location").value = article.location_id || "";
        root.querySelector("#ed-visible").checked = article.visible;
        root.querySelector("#ed-glitch").value = article.glitch || 0;
        for (const section of article.sections) {
            sectionsBox.append(buildSectionRow(section));
        }
    } else {
        root.querySelector("#ed-delete").classList.add("is-hidden");
        sectionsBox.append(buildSectionRow({ heading: "", body: "", hidden: true }));
    }

    if (!gmActive()) {
        root.querySelector("#ed-visible-label").textContent = "Public (anyone can read it)";
        root.querySelector("#ed-location-field").classList.add("is-hidden");
        root.classList.add("editor--player");
    }

    const status = root.querySelector("#ed-status");

    root.querySelector("#ed-add-section").addEventListener("click", () => {
        sectionsBox.append(buildSectionRow({ heading: "", body: "", hidden: true }));
    });

        root.querySelector("#ed-save").addEventListener("click", async () => {
        const { meta, sections } = collectForm();

        if (!meta.title) {
            status.textContent = "A title is required.";
            return;
        }
        if (!meta.slug) {
            meta.slug = slugify(meta.title);
        }

        if (!article && !gmActive()) {
            meta.author_id = getUserId();
        }

        status.textContent = "Saving…";
        try {
            let articleId;
            if (article) {
                articleId = article.id;
                await updateArticle(articleId, meta);
            } else {
                const created = await createArticle(meta);
                articleId = created.id;
            }
            await replaceSections(articleId, sections);
        } catch (err) {
            status.textContent = err.message;
            return;
        }

        await onSaved();
        window.location.hash = "#/" + meta.slug;
    });

    root.querySelector("#ed-delete").addEventListener("click", async () => {
        if (!window.confirm('Delete "' + article.title + '" and all its sections?')) {
            return;
        }
        status.textContent = "Deleting…";
        try {
            await deleteArticle(article.id);
        } catch (err) {
            status.textContent = err.message;
            return;
        }
        await onSaved();
        window.location.hash = "#/";
    });
}