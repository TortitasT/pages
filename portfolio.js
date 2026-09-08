(() => {
  "use strict";
  const projects = JSON.parse(
    document.getElementById("project-data").textContent,
  );
  const byName = new Map(projects.map((project) => [project.name, project]));
  const rows = [...document.querySelectorAll(".repo-row")];
  const list = document.getElementById("repo-list");
  const search = document.getElementById("search");
  const year = document.getElementById("year");
  const sort = document.getElementById("sort");
  const more = document.getElementById("show-more");
  const reset = document.getElementById("reset");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = { category: "All", limit: 12 };
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  function updateArchive({ reorder = false } = {}) {
    if (reorder) {
      const compare = {
        score: (a, b) =>
          b.score - a.score || b.created.localeCompare(a.created),
        newest: (a, b) => b.created.localeCompare(a.created),
        oldest: (a, b) => a.created.localeCompare(b.created),
        updated: (a, b) => b.pushed.localeCompare(a.pushed),
        name: (a, b) => a.name.localeCompare(b.name),
      }[sort.value];
      rows.sort((a, b) =>
        compare(byName.get(a.dataset.name), byName.get(b.dataset.name)),
      );
      const fragment = document.createDocumentFragment();
      rows.forEach((row) => fragment.append(row));
      list.append(fragment);
    }
    const query = normalize(search.value.trim());
    let count = 0;
    for (const row of rows) {
      const project = byName.get(row.dataset.name);
      const matches =
        (state.category === "All" || project.category === state.category) &&
        (year.value === "all" || project.created.startsWith(year.value)) &&
        (!query ||
          normalize(
            `${project.name} ${project.description} ${project.language} ${project.category}`,
          ).includes(query));
      row.hidden = !matches || ++count > state.limit;
      const date = row.querySelector("time");
      const displayDate =
        sort.value === "updated" ? project.pushed : project.created;
      date.dateTime = displayDate;
      date.textContent = new Date(
        `${displayDate}T00:00:00Z`,
      ).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      date.title = `${sort.value === "updated" ? "Last pushed" : "Repository created"} ${displayDate}`;
    }
    document.getElementById("result-count").textContent =
      `${Math.min(count, state.limit)} of ${count} ${count === 1 ? "repository" : "repositories"}`;
    document.querySelector(".archive-status > span").textContent =
      sort.value === "updated"
        ? "Dates show last push, including upstream activity in forks"
        : "Dates show repository creation";
    document.getElementById("empty-state").hidden = count !== 0;
    more.hidden = count <= state.limit;
    more.textContent = `Show ${Math.min(24, Math.max(0, count - state.limit))} more repositories ↓`;
    reset.hidden =
      !query &&
      year.value === "all" &&
      state.category === "All" &&
      sort.value === "score";
    document
      .querySelectorAll("[data-filter]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.filter === state.category),
        ),
      );
  }

  search.addEventListener("input", () => {
    state.limit = 12;
    updateArchive();
  });
  year.addEventListener("change", () => {
    state.limit = 12;
    updateArchive();
  });
  sort.addEventListener("change", () => {
    state.limit = 12;
    updateArchive({ reorder: true });
  });
  document.querySelectorAll("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      state.category = button.dataset.filter;
      state.limit = 12;
      updateArchive();
    }),
  );
  more.addEventListener("click", () => {
    const visible = new Set(rows.filter((row) => !row.hidden));
    state.limit += 24;
    updateArchive();
    // Continue reading at the next item, even when the button disappears.
    const next = rows.find((row) => !row.hidden && !visible.has(row));
    if (next) next.focus({ preventScroll: true });
  });
  reset.addEventListener("click", () => {
    search.value = "";
    year.value = "all";
    sort.value = "score";
    state.category = "All";
    state.limit = 12;
    updateArchive({ reorder: true });
    search.focus({ preventScroll: true });
  });

  const plot = document.querySelector(".plot");
  const labels = document.querySelector(".plot-labels");
  const dots = [...plot.querySelectorAll(".plot-dot")];
  let layout = "year";
  let lastWidth = 0;
  const yearGroups = ["2022", "2023", "2024", "2025", "2026"];
  const categoryGroups = [
    "Web",
    "Apps",
    "Tools",
    "Games",
    "Forks",
    "Experiments",
    "Creative",
  ];
  const groupName = (project) =>
    layout === "year" ? project.created.slice(0, 4) : project.category;
  const shortLabels = { Experiments: "Tests", Creative: "Art" };

  function drawMap(animate = false) {
    const groups = layout === "year" ? yearGroups : categoryGroups;
    const width = plot.clientWidth;
    const groupWidth = width / groups.length;
    const dotSize = width < 350 ? 8 : 10;
    const gap = width < 350 ? 12 : 14;
    const columns = Math.max(2, Math.floor((groupWidth - 8) / gap));
    const counts = new Map(groups.map((group) => [group, 0]));
    const tallest = Math.max(
      ...groups.map((group) =>
        Math.ceil(
          projects.filter((project) => groupName(project) === group).length /
            columns,
        ),
      ),
    );
    const height = Math.max(218, tallest * gap + 15);
    plot.style.height = `${height}px`;
    for (const dot of dots) {
      const group = groupName(byName.get(dot.dataset.name));
      const index = counts.get(group);
      counts.set(group, index + 1);
      const x = groups.indexOf(group) * groupWidth + (index % columns) * gap;
      const y = height - 14 - dotSize - Math.floor(index / columns) * gap;
      const from = getComputedStyle(dot).transform;
      dot.getAnimations().forEach((animation) => animation.cancel());
      dot.style.left = "0";
      dot.style.top = "0";
      dot.style.bottom = "auto";
      const transform = `translate(${x}px, ${y}px)`;
      dot.style.transform = transform;
      if (animate && !motion.matches && from !== "none") {
        dot.animate([{ transform: from }, { transform }], {
          duration: 480,
          easing: "cubic-bezier(.19,1,.22,1)",
        });
      }
    }
    labels.style.gridTemplateColumns = `repeat(${groups.length}, minmax(0, 1fr))`;
    labels.replaceChildren(
      ...groups.map((group) => {
        const link = document.createElement("a");
        link.href = "#archive";
        link.dataset.group = group;
        link.setAttribute(
          "aria-label",
          `Explore ${counts.get(group)} ${group} repositories`,
        );
        link.append(document.createTextNode(shortLabels[group] || group));
        const count = document.createElement("small");
        count.textContent = counts.get(group);
        link.append(count);
        return link;
      }),
    );
    document
      .querySelector(".atlas")
      .setAttribute(
        "aria-label",
        `Public repositories grouped by ${layout === "year" ? "creation year" : "interest"}`,
      );
  }

  document.querySelectorAll("[data-layout]").forEach((button) =>
    button.addEventListener("click", (event) => {
      if (layout === button.dataset.layout) return;
      layout = button.dataset.layout;
      document
        .querySelectorAll("[data-layout]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      drawMap(event.detail !== 0);
    }),
  );
  labels.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-group]");
    if (!link) return;
    search.value = "";
    year.value = layout === "year" ? link.dataset.group : "all";
    state.category = layout === "category" ? link.dataset.group : "All";
    state.limit = 12;
    updateArchive();
    // Keep ordinary anchor navigation, then put keyboard focus at the filters.
    requestAnimationFrame(() => search.focus({ preventScroll: true }));
  });
  new ResizeObserver(() => {
    if (plot.clientWidth !== lastWidth) {
      lastWidth = plot.clientWidth;
      drawMap(false);
    }
  }).observe(plot);
  motion.addEventListener("change", () => {
    if (motion.matches)
      dots.forEach((dot) =>
        dot.getAnimations().forEach((animation) => animation.finish()),
      );
  });

  const portrait = document.querySelector(".portrait");
  const lightbox = document.getElementById("portrait-lightbox");
  const closeLightbox = () => {
    if (motion.matches) return lightbox.close();
    // <dialog> removes the element on close, so the exit has to finish first.
    lightbox.classList.add("is-closing");
    lightbox.addEventListener(
      "animationend",
      () => {
        lightbox.classList.remove("is-closing");
        lightbox.close();
      },
      { once: true },
    );
  };
  portrait.disabled = false;
  portrait.addEventListener("click", () => lightbox.showModal());
  lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLightbox();
  });

  // All content exists in the HTML; enhancement starts only after initialization.
  updateArchive({ reorder: true });
  drawMap(false);
  document.documentElement.classList.add("js");
})();
