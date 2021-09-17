# Quill Paste Smart

[![npm](https://img.shields.io/npm/v/quill-paste-smart?style=for-the-badge)](https://www.npmjs.com/package/quill-paste-smart?activeTab=versions)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/quill-paste-smart?color=%237400da&style=for-the-badge)](https://bundlephobia.com/package/quill-paste-smart)
[![npm](https://img.shields.io/npm/dm/quill-paste-smart?style=for-the-badge)](https://www.npmjs.com/package/quill-paste-smart)
[![NPM](https://img.shields.io/npm/l/quill-paste-smart?style=for-the-badge)](https://github.com/Artem-Schander/quill-paste-smart/blob/master/LICENSE)

This plugin extends the default clipboard module of [Quill.js](https://github.com/quilljs/quill) to prevent users from pasting HTML that does not belong into the editor. To do so it looks into the toolbar configuration and decides which tags and attributes are allowed based on the possible formats.  
However, you can also decide on your own, what is allowed.

<br>

### Installation

You can install this plugin either with [npm](https://www.npmjs.com/) or with [yarn](https://yarnpkg.com/).  
Run one of the following commands from your projects root in a bash prompt.

```bash
npm i quill-paste-smart
# or: yarn add quill-paste-smart
```

<br>

### Usage

Since this plugin registers itself, it is sufficient to just import it.

```javascript
import Quill from 'quill';
import 'quill-paste-smart';
```

<br>

### Demos

* Vanilla JS
    * [ES6](https://il56g.csb.app/)
    * [CommonJS](https://8rw3l.csb.app/)
* Vue
    * [surmon-china/vue-quill-editor](https://bk79f.csb.app/)
* React
    * [zenoamaro/react-quill](https://3di00.csb.app/)
    * [gtgalone/react-quilljs](https://h3tut.csb.app/)

<br>

### Configuration

Out of the box this plugin will remove all HTML tags and attributes that are not available in the toolbar formats.  
If you don't agree with the default settings, you can decide what is allowed by yourself.  
Also I thought it could be useful to keep the pasted content selected after pasting, so there is a setting for it too.

A valid configuration could look like this:

```javascript
const options = {
    theme: 'snow',
    modules: {
        clipboard: {
            allowed: {
                tags: ['a', 'b', 'strong', 'u', 's', 'i', 'p', 'br', 'ul', 'ol', 'li', 'span'],
                attributes: ['href', 'rel', 'target', 'class']
            },
            keepSelection: true,
            substituteBlockElements: true,
            magicPasteLinks: true,
            hooks: {
                uponSanitizeElement(node, data, config) {
                    console.log(node);
                },
            },
        },
    },
};
new Quill('#editor', options);
```

> :raised_hand: **Probably you don't need a custom configuration.**  
> You could stick with the default settings by completely omit the `clipboard` object in your quill options.


#### Configuration Object

| key | valid values | default value | type | description |
|:------| :------: | :------: | :------: |:------|
| allowed.tags | HTML tags | `undefined` | `Array<string>` | Here you can define any HTML tag that should be allowed to be pasted. If this setting is not specified, allowed tags are determined by possible formats in the toolbar |
| allowed.attributes | HTML attributes | `undefined` | `Array<string>` | Here you can define any HTML attributes that should be allowed to be pasted. If this setting is not specified, allowed attributes are determined by possible formats in the toolbar |
| substituteBlockElements | `true` `false` | `true` | `Boolean` | If this setting is set to `true` all forbidden block type tags will be substituted by one of the allowed tags `p`/`div`/`section` |
| keepSelection | `true` `false` | `false` | `Boolean` | If this setting is set to `true` the pasted content will be selected after pasting it. Otherwise the cursor will be placed right after the pasted content |
| magicPasteLinks | `true` `false` | `false` | `Boolean` | If this setting is set to `true` pasted URLs over selected text will be converted to an `a` tag. Example: If you select the word `foo` and paste the URL `https://foo.bar/` the result will be `<a href="https://foo.bar/">foo</a>`. Note: This only works if there is nothing pasted except a valid URL. |
| hooks | [DOMPurify Hooks](https://github.com/cure53/DOMPurify#hooks) | `undefined` | `Array<function>` | Here you can define any of the DOMPurify hooks. This can be handy if you need to cusomtize the HTML sanitizer. For more information see the [hook demos](https://github.com/cure53/DOMPurify/tree/main/demos) from DOMPurify.<br>**BE AWARE**<br>Here you can mess up things. E.g. You could create an infinite loop by adding not allowed tags to the node. |

<br>

### CommonJS

It is possible to use this module by including it though a `<script>` tag. Here is a full example.

```html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quill Paste Smart</title>
    <link href="https://unpkg.com/quill@latest/dist/quill.snow.css" rel="stylesheet">
</head>
<body>
    <div id="editor"></div>

    <script src="https://unpkg.com/quill@latest/dist/quill.js"></script>
    <script src="https://unpkg.com/quill-paste-smart@latest/dist/quill-paste-smart.js"></script>

    <script>
        var quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: ['bold', 'italic', 'underline', 'link'],
            }
        });
    </script>
</body>
</html>
```


<br>

### License
This plugin is licensed under the terms of the [MIT License](https://github.com/Artem-Schander/quill-paste-smart/blob/master/LICENSE)
(See LICENSE file for details).
