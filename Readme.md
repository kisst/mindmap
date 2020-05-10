# Data driven mindmap based on d3j

rich data formating convension:
All formating items are under the item to be formated, under a key `__attrs`

 - icons - sub key-value with key `icon` ( pick from [fontawesome](https://fontawesome.com/v4.7.0/icons/)  )
 - alligment  - sub key-value with key `alligment` ( not ready )
 - font color - sub key-value with key `color`
 - text background - sub key-value with key `background`
 - hyperlink - sub key-value with key `hyperlink`

parent - child relation:

It's plain YAML, so for example
```
main subject:
  subject:
    sub_subject:
  2nd subject:
    sub_subject:
    andother:
```

## Parameters

 - There is an option to hide all parent, and just share a small section of the whole map
by specifying the `?root=key.subkey` in the browser bar [for example](https://kisst.github.io/mindmap/?root=tooling)

 - There is an option to set the focus to a part of the mindmap, but while keeping
 the parent items visable, just keeping all other branches closed by specifying the
 `?initial=key.subkey` in the browser bar [for example](https://kisst.github.io/mindmap/?initial=mvp)

 - There is an option to load a different data file by specifying the `?src_data=filename.yaml` in the urlbar


## Testing

 - Edit data.yaml
 - Run
```
python3 -m http.server
```
 - Open a browser and visit http://localhost:8000
 - Keep editing data.yaml
 - Hit refresh in the browser

Current state can be viewed at [GitHub Pages](https://kisst.github.io/mindmap/)

