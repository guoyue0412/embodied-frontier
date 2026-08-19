import { useEffect } from "react";

export default function MediaLightbox() {
  useEffect(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>(".prose-figure__lightbox")];
    if (!links.length) return undefined;

    const dialog = document.createElement("dialog");
    dialog.className = "media-lightbox";
    dialog.setAttribute("aria-label", "图片预览");
    dialog.innerHTML = '<button type="button" class="media-lightbox__close" aria-label="关闭图片预览">×</button><img alt="" /><p></p>';
    document.body.append(dialog);
    const image = dialog.querySelector("img");
    const caption = dialog.querySelector("p");
    const close = dialog.querySelector("button");
    if (!(image instanceof HTMLImageElement) || !(caption instanceof HTMLParagraphElement) || !(close instanceof HTMLButtonElement)) return undefined;

    const closeDialog = () => dialog.close();
    const openDialog = (event: Event) => {
      event.preventDefault();
      const link = event.currentTarget;
      if (!(link instanceof HTMLAnchorElement)) return;
      const source = link.dataset.lightboxSrc || link.href;
      image.src = source;
      image.alt = link.querySelector("img")?.getAttribute("alt") || "";
      caption.textContent = image.alt;
      if (typeof dialog.showModal === "function") dialog.showModal();
    };
    links.forEach((link) => link.addEventListener("click", openDialog));
    close.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    return () => {
      links.forEach((link) => link.removeEventListener("click", openDialog));
      close.removeEventListener("click", closeDialog);
      dialog.remove();
    };
  }, []);

  return null;
}
