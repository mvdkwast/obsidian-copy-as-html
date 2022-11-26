# Copy Document as HTML + Api

Adds accessable api functions to this plugin: [copy-as-html](https://github.com/mvdkwast/obsidian-copy-as-html)

## Added Functions
- **Note**: These functions are added to the plugin instance itself.
- **Note**: All functions are async! They return promises you must await!
### <u>Convert View</u>
Convert a markdown view to an html element.

_Params_:
* *{MarkdownView}* **view** The markdown: view to convert
* *{{convertSvgToBitmap: boolean, removeFrontMatter: boolean}}* **options**: The options to pass to the converter.

*Return*: 

**Promise\<HTMLElement>**: A promise for an html element with the result of the markdown as html

### <u>Convert Markdown</u>
Convert a raw markdown string to an html element.

**Note**: This may cause tabs to open and close temporatily in the background, this is nessicary to render the items property without using the current view.

_Params_:
* *{string}* **markdown**: The raw markdown content string to convert
* *{string | undefined}* **sourceFilePath**: The source file to use for fetching frontmatter, links, embeds, etc.
* *{{convertSvgToBitmap: boolean, removeFrontMatter: boolean}}* **options**: The options to pass to the converter.

*Return*: 

**Promise\<HTMLElement>**: A promise for an html element with the result of the markdown as html

## Credits

- mvdkwast for the base plugin: [copy-as-html](https://github.com/mvdkwast/obsidian-copy-as-html)
