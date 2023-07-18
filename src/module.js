import Quill from "quill";
import DOMPurify from "dompurify";

const Clipboard = Quill.import("modules/clipboard");
const Delta = Quill.import("delta");

class QuillPasteSmart extends Clipboard {
  constructor(quill, options) {
    super(quill, options);

    this.allowed = options.allowed;
    this.keepSelection = options.keepSelection;
    this.substituteBlockElements = options.substituteBlockElements;
    this.magicPasteLinks = options.magicPasteLinks;
    this.hooks = options.hooks;
  }

  onPaste(e) {
    e.preventDefault();
    const range = this.quill.getSelection();

    let text;
    let html;
    let file;

    if (
      (!e.clipboardData || !e.clipboardData.getData) &&
      window.clipboardData &&
      window.clipboardData.getData
    ) {
      // compatibility with older IE versions
      text = window.clipboardData.getData("Text");
    } else {
      text = e.clipboardData.getData("text/plain");
      html = e.clipboardData.getData("text/html");
      file = e.clipboardData?.items?.[0];
    }

    let delta = new Delta().retain(range.index).delete(range.length);

    const DOMPurifyOptions = this.getDOMPurifyOptions();

    let content = text;
    if (html) {
      // add hooks to accessible setttings
      if (typeof this.hooks?.beforeSanitizeElements === "function") {
        DOMPurify.addHook(
          "beforeSanitizeElements",
          this.hooks.beforeSanitizeElements
        );
      }
      if (typeof this.hooks?.uponSanitizeElement === "function") {
        DOMPurify.addHook(
          "uponSanitizeElement",
          this.hooks.uponSanitizeElement
        );
      }
      if (typeof this.hooks?.afterSanitizeElements === "function") {
        DOMPurify.addHook(
          "afterSanitizeElements",
          this.hooks.afterSanitizeElements
        );
      }
      if (typeof this.hooks?.beforeSanitizeAttributes === "function") {
        DOMPurify.addHook(
          "beforeSanitizeAttributes",
          this.hooks.beforeSanitizeAttributes
        );
      }
      if (typeof this.hooks?.uponSanitizeAttribute === "function") {
        DOMPurify.addHook(
          "uponSanitizeAttribute",
          this.hooks.uponSanitizeAttribute
        );
      }
      if (typeof this.hooks?.afterSanitizeAttributes === "function") {
        DOMPurify.addHook(
          "afterSanitizeAttributes",
          this.hooks.afterSanitizeAttributes
        );
      }
      if (typeof this.hooks?.beforeSanitizeShadowDOM === "function") {
        DOMPurify.addHook(
          "beforeSanitizeShadowDOM",
          this.hooks.beforeSanitizeShadowDOM
        );
      }
      if (typeof this.hooks?.uponSanitizeShadowNode === "function") {
        DOMPurify.addHook(
          "uponSanitizeShadowNode",
          this.hooks.uponSanitizeShadowNode
        );
      }
      if (typeof this.hooks?.afterSanitizeShadowDOM === "function") {
        DOMPurify.addHook(
          "afterSanitizeShadowDOM",
          this.hooks.afterSanitizeShadowDOM
        );
      }

      if (this.substituteBlockElements !== false) {
        // html = DOMPurify.sanitize(html, { ...DOMPurifyOptions, ...{ RETURN_DOM: true, WHOLE_DOCUMENT: false } });
        html = this.substitute(html, DOMPurifyOptions);
        content = html.innerHTML;
      } else {
        content = DOMPurify.sanitize(html, DOMPurifyOptions);
      }

      delta = delta.concat(this.convert(content));
    } else if (
      DOMPurifyOptions.ALLOWED_TAGS.includes("a") &&
      this.isURL(text) &&
      range.length > 0 &&
      this.magicPasteLinks
    ) {
      content = this.quill.getText(range.index, range.length);

      // NOTE: add https:// to url if not contains
      const link = !/^https?:\/\//i.test(text) ? `https://${text}` : text;

      delta = delta.insert(content, {
        link,
      });
    } else if (
      DOMPurifyOptions.ALLOWED_TAGS.includes("img") &&
      file &&
      file.kind === "file" &&
      file.type.match(/^image\//i)
    ) {
      const image = file.getAsFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        this.quill.insertEmbed(range.index, "image", e.target.result);
        // if required, manually update the selection after the file loads
        if (!this.keepSelection) this.quill.setSelection(range.index + 1);
      };
      reader.readAsDataURL(image);
    } else {
      delta = delta.insert(content);
    }

    this.quill.updateContents(delta, Quill.sources.USER);

    // move cursor
    delta = this.convert(content);
    if (this.keepSelection)
      this.quill.setSelection(
        range.index,
        delta.length(),
        Quill.sources.SILENT
      );
    else
      this.quill.setSelection(
        range.index + delta.length(),
        Quill.sources.SILENT
      );
    this.quill.scrollIntoView();
    DOMPurify.removeAllHooks();
  }

  getDOMPurifyOptions() {
    let tidy = {};

    if (this.allowed?.tags) tidy.ALLOWED_TAGS = this.allowed.tags;
    if (this.allowed?.attributes) tidy.ALLOWED_ATTR = this.allowed.attributes;

    if (tidy.ALLOWED_TAGS === undefined || tidy.ALLOWED_ATTR === undefined) {
      let undefinedTags = false;
      if (tidy.ALLOWED_TAGS === undefined) {
        undefinedTags = true;
        tidy.ALLOWED_TAGS = ["p", "br", "span"];
      }

      let undefinedAttr = false;
      if (tidy.ALLOWED_ATTR === undefined) {
        undefinedAttr = true;
        tidy.ALLOWED_ATTR = ["class"];
      }

      const toolbar = this.quill.getModule("toolbar");
      toolbar?.controls?.forEach((control) => {
        switch (control[0]) {
          case "bold":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("b");
              tidy.ALLOWED_TAGS.push("strong");
            }
            break;

          case "italic":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("i");
              tidy.ALLOWED_TAGS.push("em");
            }
            break;

          case "underline":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("u");
            }
            break;

          case "strike":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("s");
            }
            break;

          case "color":
          case "background":
            if (undefinedAttr) {
              tidy.ALLOWED_ATTR.push("style");
            }
            break;

          case "script":
            if (undefinedTags) {
              if (control[1].value === "super") {
                tidy.ALLOWED_TAGS.push("sup");
              } else if (control[1].value === "sub") {
                tidy.ALLOWED_TAGS.push("sub");
              }
            }
            break;

          case "header":
            if (undefinedTags) {
              const detectAllowedHeadingTag = (value) => {
                if (value === "1") {
                  tidy.ALLOWED_TAGS.push("h1");
                } else if (value === "2") {
                  tidy.ALLOWED_TAGS.push("h2");
                } else if (value === "3") {
                  tidy.ALLOWED_TAGS.push("h3");
                } else if (value === "4") {
                  tidy.ALLOWED_TAGS.push("h4");
                } else if (value === "5") {
                  tidy.ALLOWED_TAGS.push("h5");
                } else if (value === "6") {
                  tidy.ALLOWED_TAGS.push("h6");
                }
              };

              if (control[1].value) detectAllowedHeadingTag(control[1].value);
              else if (control[1].options && control[1].options.length) {
                [].forEach.call(control[1].options, (option) => {
                  if (option.value) detectAllowedHeadingTag(option.value);
                });
              }
            }
            break;

          case "code-block":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("pre");
            }
            if (undefinedAttr) {
              tidy.ALLOWED_ATTR.push("spellcheck");
            }
            break;

          case "list":
            if (undefinedTags) {
              if (control[1].value === "ordered") {
                tidy.ALLOWED_TAGS.push("ol");
              } else if (control[1].value === "bullet") {
                tidy.ALLOWED_TAGS.push("ul");
              }
              tidy.ALLOWED_TAGS.push("li");
            }
            break;

          case "link":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("a");
            }
            if (undefinedAttr) {
              tidy.ALLOWED_ATTR.push("href");
              tidy.ALLOWED_ATTR.push("target");
              tidy.ALLOWED_ATTR.push("rel");
            }
            break;

          case "image":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("img");
            }
            if (undefinedAttr) {
              tidy.ALLOWED_ATTR.push("src");
              tidy.ALLOWED_ATTR.push("title");
              tidy.ALLOWED_ATTR.push("alt");
            }
            break;

          case "video":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push("iframe");
            }
            if (undefinedAttr) {
              tidy.ALLOWED_ATTR.push("frameborder");
              tidy.ALLOWED_ATTR.push("allowfullscreen");
              tidy.ALLOWED_ATTR.push("src");
            }
            break;

          case "blockquote":
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push(control[0]);
            }
            break;
        }
      });
    }

    return tidy;
  }

  // replace forbidden block elements with a p tag
  substitute(html, DOMPurifyOptions) {
    let substitution;

    const headings = ["h1", "h2", "h3", "h4", "h5", "h6"];
    const blockElements = [
      "p",
      "div",
      "section",
      "article",
      "fieldset",
      "address",
      "aside",
      "blockquote",
      "canvas",
      "dl",
      "figcaption",
      "figure",
      "footer",
      "form",
      "header",
      "main",
      "nav",
      "noscript",
      "ol",
      "pre",
      "table",
      "tfoot",
      "ul",
      "video",
    ];
    const newLineElements = ["li", "dt", "dd", "hr"];

    DOMPurify.addHook("uponSanitizeElement", (node, data, config) => {
      // check if current tag is a heading
      // - is it supported?
      // - no? - replace it with <p> and <b>
      // -----------------
      // check if current tag is a block element
      // - is it supported?
      // - no? - replace it with <p>
      // -----------------
      // check if current tag is a new line element
      // - is it supported?
      // - no? - remove the tag and append a <br>

      // find possible substitution
      let i = 0;
      while (!substitution && i < 3) {
        if (DOMPurifyOptions.ALLOWED_TAGS.includes(blockElements[i]))
          substitution = blockElements[i];
        ++i;
      }

      if (
        substitution &&
        node.tagName &&
        !DOMPurifyOptions.ALLOWED_TAGS.includes(node.tagName.toLowerCase())
      ) {
        const tagName = node.tagName.toLowerCase();
        if (headings.includes(tagName)) {
          node.innerHTML = `<${substitution}><b>${node.innerHTML}</b></${substitution}>`;
        } else if (blockElements.includes(tagName)) {
          node.innerHTML = `<${substitution}>${node.innerHTML}</${substitution}>`;
        } else if (newLineElements.includes(tagName)) {
          node.innerHTML = `${node.innerHTML}<br>`;
        }
      }
    });

    html = DOMPurify.sanitize(html, {
      ...DOMPurifyOptions,
      ...{ RETURN_DOM: true, WHOLE_DOCUMENT: false },
    });
    DOMPurify.removeAllHooks();

    // fix quill bug #3333
    // span content placed into the next tag

    let depth = 0;
    const walkTheDOM = (node, func) => {
      func(node, depth);
      // node = node.firstChild;
      if (depth <= 1) node = node.firstChild;
      else node = undefined;
      while (node) {
        ++depth;
        walkTheDOM(node, func);
        node = node.nextSibling;
      }
      --depth;
    };

    let block;
    const fixedDom = document.createElement("body");
    walkTheDOM(html, (node, depth) => {
      if (depth === 1) {
        if (
          node.tagName &&
          blockElements.includes(node.tagName.toLowerCase())
        ) {
          if (block) block = undefined;
          const element = document.createElement(node.tagName.toLowerCase());
          element.innerHTML = node.innerHTML;
          fixedDom.appendChild(element);
        } else {
          if (block === undefined) {
            block = document.createElement(substitution);
            fixedDom.appendChild(block);
          }

          if (node.tagName) {
            const element = document.createElement(node.tagName.toLowerCase());

            const attributes = node.attributes;
            if (attributes.length) {
              Array.from(attributes).forEach((el) =>
                element.setAttribute(el.nodeName, el.value)
              );
            }

            if (node.innerHTML) element.innerHTML = node.innerHTML;
            block.appendChild(element);
          } else {
            // plain text
            const element = document.createTextNode(node.textContent);
            block.appendChild(element);
          }
        }
      }
    });

    return fixedDom;
  }

  isURL(str) {
    const pattern =
      /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
    return !!pattern.test(str);
  }
}

Quill.register("modules/clipboard", QuillPasteSmart, true);
export default QuillPasteSmart;
