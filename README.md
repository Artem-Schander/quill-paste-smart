# Quill Paste Smart

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
    theme: 'snow'
    modules: {
        clipboard: {
            allowed: {
                tags: ['a', 'b', 'strong', 'u', 's', 'i', 'p', 'br', 'ul', 'ol', 'li', 'span'],
                attributes: ['href', 'rel', 'target', 'class']
            },
            keepSelection: true,
        },
    },
};
new Quill('#editor', options);
```


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
