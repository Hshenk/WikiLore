import { searchArticles } from "./live.js";

let getArticles = null;

export function initSearch(articleGetter) {
    getArticles = articleGetter;

    const input = document.querySelector("#search-box");
    const results = document.querySelector("#search-results");

    let timer = null;
    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => runSearch(input, results), 250);
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSearch(input, results);
        }
    });

    results.addEventListener("click", (event) => {
        if (event.target.closest(".search-hit")) {
            closeSearch(input, results);
        }
    });

    // A click outside of the search area closes the dropdown
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".search-wrap")) {
            results.classList.add("is-hidden");
        }
    });
}

function closeSearch(input, results) {
    input.value = "";
    results.classList.add("is-hidden");
}

async function runSearch(input, results) {
    let term = input.value.trim();

    // "-l term" : searches only for that term if it is missing a link
    let unlinkedOnly = false;
    if (term === "-l" || term.startsWith("-l")) {
        unlinkedOnly = true;
        term = term.slice(2).trim();
    }

    if (term.length < 2) {
        results.classList.add("is-hidden");
        return;
    }

    // Instant half: from titles cached. Only check if not searching missing links
    const hits = [];
    if (!unlinkedOnly) {
        const lower = term.toLowerCase();
        for (const article of getArticles()) {
            if (article.title.toLowerCase().includes(lower)) {
                hits.push({ slug: article.slug, title: article.title, snippet: "" });
            }
        }
    }

    // Server half: Body text 
    const seen = new Set(hits.map((hit) => hit.slug));
    try {
        for (const hit of await searchArticles(term, unlinkedOnly)) {
            if (!seen.has(hit.slug)) {
                hits.push(hit);
            }
        }
    } catch (err) {
        console.warn(err.message);
    }

    if (unlinkedOnly) {
        hits.sort((a, b) => Number(a.has_link) - Number(b.has_link));
    }

    renderResults(hits, results, unlinkedOnly);
}

function renderResults(hits, results, unlinkedOnly) {
    results.replaceChildren();
    results.classList.remove("is-hidden");

    if (unlinkedOnly) {
        const mode = document.createElement("p");
        mode.className = "search-mode";
        mode.textContent = "Unlinked mentions only";
        results.append(mode);
    }

    if (hits.length === 0) {
        const none = document.createElement("p");
        none.className = "search-empty";
        none.textContent = unlinkedOnly
            ? "No unlinked mentions - everything is already linked."
            : "Nothing found - or nothing revealed."
        results.append(none);
        return;
    }

    for (const hit of hits) {
        const link = document.createElement("a");
        link.className = "search-hit";
        link.href = "#/" + hit.slug;

        const title = document.createElement("span");
        title.className = "search-hit__title";
        title.textContent = hit.title;
        link.append(title);

        if (hit.has_link === false) {
            link.classList.add("search-hit--needs-link");
            const flag = document.createElement("span");
            flag.className = "search-hit__flag";
            flag.textContent = "no link yet";
            title.append(flag);
        }

        if (hit.snippet) {
            const snippet = document.createElement("span");
            snippet.className = "search-hit__snippet";
            snippet.textContent = "…" + hit.snippet + "…";
            link.append(snippet);
        }

        results.append(link);
    }
}