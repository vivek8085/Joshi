const revealItems = document.querySelectorAll(".reveal");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");
const navLinks = document.querySelectorAll("#site-nav a");
const typingName = document.querySelector(".typing-name");
const marqueeContainer = document.querySelector(".projects-marquee");
const marqueeTrack = document.querySelector("#projects-marquee-track");
const lightbox = document.querySelector("#image-lightbox");
const lightboxPreview = document.querySelector("#image-lightbox-preview");
const lightboxClose = document.querySelector("#image-lightbox-close");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fallbackProjectImages = Array.isArray(window.PROJECT_IMAGES) ? window.PROJECT_IMAGES : [];

revealItems.forEach((item, index) => {
  item.style.setProperty("--reveal-delay", String(index % 6));
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => revealObserver.observe(item));

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menuToggle.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      nav.classList.remove("is-open");
      menuToggle.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

if (typingName) {
  const fullText = typingName.getAttribute("data-text") || "";
  typingName.textContent = "";

  if (prefersReducedMotion) {
    typingName.textContent = fullText;
  } else {
    let index = 0;
    const typeTimer = setInterval(() => {
      typingName.textContent += fullText.charAt(index);
      index += 1;

      if (index >= fullText.length) {
        clearInterval(typeTimer);
      }
    }, 95);
  }
}

const createMarqueeItem = (image, isDuplicate) => {
  const src = typeof image?.src === "string" ? image.src.trim() : "";
  if (!src) {
    return null;
  }

  const alt = typeof image?.alt === "string" ? image.alt : "Project image";
  const figure = document.createElement("figure");
  figure.className = "projects-marquee-item";
  if (isDuplicate) {
    figure.setAttribute("aria-hidden", "true");
  }

  const img = document.createElement("img");
  img.className = "projects-marquee-image";
  img.src = src;
  img.alt = isDuplicate ? "" : alt;
  figure.appendChild(img);

  return figure;
};

const renderMarqueeImages = (images) => {
  if (!marqueeTrack || !marqueeContainer) {
    return;
  }

  const validImages = images.filter((image) => typeof image?.src === "string" && image.src.trim() !== "");
  if (validImages.length === 0) {
    marqueeContainer.style.display = "none";
    marqueeTrack.innerHTML = "";
    return;
  }

  marqueeContainer.style.display = "";
  const allItems = [...validImages, ...validImages];
  const fragment = document.createDocumentFragment();
  allItems.forEach((image, index) => {
    const item = createMarqueeItem(image, index >= validImages.length);
    if (item) {
      fragment.appendChild(item);
    }
  });

  marqueeTrack.innerHTML = "";
  marqueeTrack.appendChild(fragment);
};

const loadProjectImages = async () => {
  try {
    const response = await fetch("/api/project-images", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch image list");
    }

    const data = await response.json();
    if (Array.isArray(data?.images) && data.images.length > 0) {
      return data.images;
    }
  } catch (error) {
    console.warn("Using fallback project image list.", error);
  }

  return fallbackProjectImages;
};

if (marqueeTrack) {
  loadProjectImages().then(renderMarqueeImages);
}

if (lightbox && lightboxPreview && lightboxClose && marqueeTrack) {
  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxPreview.src = "";
    lightboxPreview.alt = "";
    document.body.classList.remove("lightbox-open");
  };

  marqueeTrack.addEventListener("click", (event) => {
    const image = event.target.closest(".projects-marquee-image");
    if (!image) {
      return;
    }

    const imageItem = image.closest(".projects-marquee-item");
    if (!imageItem || imageItem.getAttribute("aria-hidden") === "true") {
      return;
    }

    lightboxPreview.src = image.currentSrc || image.src;
    lightboxPreview.alt = image.alt || "Project image preview";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
  });

  lightboxClose.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
}
