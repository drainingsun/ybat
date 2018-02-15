
(() => {
    "use strict"

    // Parameters
    const saveInterval = 60 // Seconds
    const fontBaseSize = 30 // Pixels
    const fontColor = "#001f3f"
    const borderColor = "#001f3f"
    const backgroundColor = "rgba(0, 116, 217, 0.2)"
    const markedFontColor = "#FF4136"
    const markedBorderColor = "#FF4136"
    const markedBackgroundColor = "rgba(255, 133, 27, 0.2)"
    const minBBoxWidth = 5 // Pixels
    const minBBoxHeight = 5 // Pixels
    const scrollSpeed = 1.1 // Multiplying factor
    const minZoom = 0.1 // Min size of original
    const maxZoom = 5 // Max size of original
    const edgeSize = 5 // Pixels
    let scale = 0.5 // Default zoom level

    // Main containers
    let canvas = null
    let images = {}
    let classes = {}
    let bboxes = {}

    const extensions = ["jpg", "jpeg", "png"]

    let currentImage = null
    let currentClass = null
    let currentBbox = null
    let imageListIndex = 0
    let classListIndex = 0

    // Scaling containers
    let canvasX = 0
    let canvasY = 0
    let screenX = 0
    let screenY = 0

    // Mouse container
    const mouse = {
        x: 0,
        y: 0,
        realX: 0,
        realY: 0,
        buttonL: false,
        buttonR: false,
        startRealX: 0,
        startRealY: 0
    }

    // Prevent context menu on right click - it's used for panning
    document.addEventListener("contextmenu", function (e) {
        e.preventDefault()
    }, false)

    // Save bboxes to local storage every X seconds
    setInterval(() => {
        if (Object.keys(bboxes).length > 0) {
            localStorage.setItem("bboxes", JSON.stringify(bboxes))
        }
    }, saveInterval * 1000)

    // Start everything
    document.onreadystatechange = () => {
        if (document.readyState === "complete") {
            listenCanvas()
            listenCanvasMouse()
            listenImageLoad()
            listenImageSelect()
            listenClassLoad()
            listenClassSelect()
            listenBboxLoad()
            listenBboxSave()
            listenBboxRestore()
            listenKeyboard()
        }
    }

    const listenCanvas = () => {
        canvas = new Canvas("canvas", document.getElementById("right").clientWidth, window.innerHeight - 20)

        canvas.on("draw", (context) => {
            if (currentImage !== null) {
                drawImage(context)
                drawNewBbox(context)
                drawExistingBboxes(context)
            } else {
                drawIntro(context)
            }
        }).start()
    }

    const drawImage = (context) => {
        context.drawImage(currentImage.object, zoomX(0), zoomY(0), zoom(currentImage.width), zoom(currentImage.height))
    }

    const drawIntro = (context) => {
        setFontStyles(context, false)
        context.fillText("USAGE:", zoomX(20), zoomY(50))
        context.fillText("1. Load your images (jpg, png). Might be slow if many or big.", zoomX(20), zoomY(100))
        context.fillText("2. Load your classes (yolo *.names format).", zoomX(20), zoomY(150))
        context.fillText("3. Load or restore, if any, bboxes (zipped yolo *.txt files).", zoomX(20), zoomY(200))
        context.fillText("NOTES:", zoomX(20), zoomY(300))
        context.fillText("1: Images and classes must be loaded before bbox load.", zoomX(20), zoomY(350))
        context.fillText("2: Reloading images will RESET BBOXES!", zoomX(20), zoomY(400))
        context.fillText("3: Check out README.md for more information.", zoomX(20), zoomY(450))
    }

    const drawNewBbox = (context) => {
        if (mouse.buttonL === true && currentClass !== null && currentBbox === null) {
            const width = (mouse.realX - mouse.startRealX)
            const height = (mouse.realY - mouse.startRealY)

            setBBoxStyles(context, true)
            context.strokeRect(zoomX(mouse.startRealX), zoomY(mouse.startRealY), zoom(width), zoom(height))
            context.fillRect(zoomX(mouse.startRealX), zoomY(mouse.startRealY), zoom(width), zoom(height))
        }
    }

    const drawExistingBboxes = (context) => {
        const currentBboxes = bboxes[currentImage.name]

        for (let className in currentBboxes) {
            currentBboxes[className].forEach(bbox => {
                setFontStyles(context, bbox.marked)
                context.fillText(className, zoomX(bbox.x), zoomY(bbox.y - 2))

                setBBoxStyles(context, bbox.marked)
                context.strokeRect(zoomX(bbox.x), zoomY(bbox.y), zoom(bbox.width), zoom(bbox.height))
                context.fillRect(zoomX(bbox.x), zoomY(bbox.y), zoom(bbox.width), zoom(bbox.height))
            })
        }
    }

    const setBBoxStyles = (context, marked) => {
        if (marked === false) {
            context.strokeStyle = borderColor
            context.fillStyle = backgroundColor
        } else {
            context.strokeStyle = markedBorderColor
            context.fillStyle = markedBackgroundColor
        }
    }

    const setFontStyles = (context, marked) => {
        if (marked === false) {
            context.fillStyle = fontColor
        } else {
            context.fillStyle = markedFontColor
        }

        context.font = context.font.replace(/\d+px/, `${zoom(fontBaseSize)}px`)
    }

    const listenCanvasMouse = () => {
        canvas.element.addEventListener("wheel", trackWheel, {passive: false})
        canvas.element.addEventListener("mousemove", trackPointer)
        canvas.element.addEventListener("mousedown", trackPointer)
        canvas.element.addEventListener("mouseup", trackPointer)
        canvas.element.addEventListener("mouseout", trackPointer)
    }

    const trackWheel = (event) => {
        if (event.deltaY < 0) {
            scale = Math.min(maxZoom, scale * scrollSpeed)
        } else {
            scale = Math.max(minZoom, scale * (1 / scrollSpeed))
        }

        canvasX = mouse.realX
        canvasY = mouse.realY
        screenX = mouse.x
        screenY = mouse.y

        mouse.realX = zoomXInv(mouse.x)
        mouse.realY = zoomYInv(mouse.y)

        event.preventDefault()
    }

    const trackPointer = (event) => {
        mouse.bounds = canvas.element.getBoundingClientRect()
        mouse.x = event.clientX - mouse.bounds.left
        mouse.y = event.clientY - mouse.bounds.top

        const xx = mouse.realX
        const yy = mouse.realY

        mouse.realX = zoomXInv(mouse.x)
        mouse.realY = zoomYInv(mouse.y)

        if (event.type === "mousedown") {
            mouse.startRealX = mouse.realX
            mouse.startRealY = mouse.realY

            if (event.which === 3) {
                mouse.buttonR = true
            } else if (event.which === 1) {
                mouse.buttonL = true
            }
        } else if (event.type === "mouseup" || event.type === "mouseout") {
            if (mouse.buttonL === true && currentImage !== null && currentClass !== null) {
                const movedWidth = Math.max((mouse.startRealX - mouse.realX), (mouse.realX - mouse.startRealX))
                const movedHeight = Math.max((mouse.startRealY - mouse.realY), (mouse.realY - mouse.startRealY))

                if (movedWidth > minBBoxWidth && movedHeight > minBBoxHeight) { // Only add if bbox is big enough
                    if (currentBbox === null) { // And only when no other bbox is selected
                        storeNewBbox(movedWidth, movedHeight)
                    } else { // Bbox was moved or resized - update original data
                        updateBboxAfterTransform()
                    }
                } else { // (un)Mark a bbox
                    setBboxMarkedState()

                    if (currentBbox !== null) { // Bbox was moved or resized - update original data
                        updateBboxAfterTransform()
                    }
                }
            }

            mouse.buttonR = false
            mouse.buttonL = false
        }

        moveBbox()
        resizeBbox()
        changeCursorByLocation()

        panImage(xx, yy)
    }

    const storeNewBbox = (movedWidth, movedHeight) => {
        const bbox = {
            x: Math.min(mouse.startRealX, mouse.realX),
            y: Math.min(mouse.startRealY, mouse.realY),
            width: movedWidth,
            height: movedHeight,
            marked: true,
            class: currentClass
        }

        if (typeof bboxes[currentImage.name] === "undefined") {
            bboxes[currentImage.name] = {}
        }

        if (typeof bboxes[currentImage.name][currentClass] === "undefined") {
            bboxes[currentImage.name][currentClass] = []
        }

        bboxes[currentImage.name][currentClass].push(bbox)

        currentBbox = {
            bbox: bbox,
            index: bboxes[currentImage.name][currentClass].length - 1,
            originalX: bbox.x,
            originalY: bbox.y,
            originalWidth: bbox.width,
            originalHeight: bbox.height,
            moving: false,
            resizing: null
        }
    }

    const updateBboxAfterTransform = () => {
        if (currentBbox.resizing !== null) {
            if (currentBbox.bbox.width < 0) {
                currentBbox.bbox.width = Math.abs(currentBbox.bbox.width)
                currentBbox.bbox.x -= currentBbox.bbox.width
            }

            if (currentBbox.bbox.height < 0) {
                currentBbox.bbox.height = Math.abs(currentBbox.bbox.height)
                currentBbox.bbox.y -= currentBbox.bbox.height
            }

            currentBbox.resizing = null
        }

        currentBbox.bbox.marked = true
        currentBbox.originalX = currentBbox.bbox.x
        currentBbox.originalY = currentBbox.bbox.y
        currentBbox.originalWidth = currentBbox.bbox.width
        currentBbox.originalHeight = currentBbox.bbox.height
        currentBbox.moving = false
    }

    const setBboxMarkedState = () => {
        if (currentBbox === null || (currentBbox.moving === false && currentBbox.resizing === null)) {
            const currentBboxes = bboxes[currentImage.name]

            let wasInside = false
            let smallestBbox = Number.MAX_SAFE_INTEGER

            for (let className in currentBboxes) {
                for (let i = 0; i < currentBboxes[className].length; i++) {
                    const bbox = currentBboxes[className][i]

                    bbox.marked = false

                    const endX = bbox.x + bbox.width
                    const endY = bbox.y + bbox.height
                    const size = bbox.width * bbox.height

                    if (mouse.startRealX >= bbox.x && mouse.startRealX <= endX
                        && mouse.startRealY >= bbox.y && mouse.startRealY <= endY) {

                        wasInside = true

                        if (size < smallestBbox) { // Make sure select the inner if it's inside a bigger one
                            smallestBbox = size
                            currentBbox = {
                                bbox: bbox,
                                index: i,
                                originalX: bbox.x,
                                originalY: bbox.y,
                                originalWidth: bbox.width,
                                originalHeight: bbox.height,
                                moving: false,
                                resizing: null
                            }
                        }
                    }
                }
            }

            if (wasInside === false) { // No more selected bbox
                currentBbox = null
            }
        }
    }

    const moveBbox = () => {
        if (mouse.buttonL === true && currentBbox !== null) {
            const endX = currentBbox.bbox.x + currentBbox.bbox.width
            const endY = currentBbox.bbox.y + currentBbox.bbox.height

            // Only if pointer inside the bbox
            if (mouse.startRealX >= (currentBbox.bbox.x + edgeSize) && mouse.startRealX <= (endX - edgeSize)
                && mouse.startRealY >= (currentBbox.bbox.y + edgeSize) && mouse.startRealY <= (endY - edgeSize)) {

                currentBbox.moving = true
            }

            if (currentBbox.moving === true) {
                currentBbox.bbox.x = currentBbox.originalX + (mouse.realX - mouse.startRealX)
                currentBbox.bbox.y = currentBbox.originalY + (mouse.realY - mouse.startRealY)
            }
        }
    }

    const resizeBbox = () => {
        if (mouse.buttonL === true && currentBbox !== null) {
            const topLeftX = currentBbox.bbox.x
            const topLeftY = currentBbox.bbox.y
            const bottomLeftX = currentBbox.bbox.x
            const bottomLeftY = currentBbox.bbox.y + currentBbox.bbox.height
            const topRightX = currentBbox.bbox.x + currentBbox.bbox.width
            const topRightY = currentBbox.bbox.y
            const bottomRightX = currentBbox.bbox.x + currentBbox.bbox.width
            const bottomRightY = currentBbox.bbox.y + currentBbox.bbox.height

            // Get correct corner
            if (mouse.startRealX >= (topLeftX - edgeSize) && mouse.startRealX <= (topLeftX + edgeSize)
                && mouse.startRealY >= (topLeftY - edgeSize) && mouse.startRealY <= (topLeftY + edgeSize)) {

                currentBbox.resizing = "topLeft"
            } else if (mouse.startRealX >= (bottomLeftX - edgeSize) && mouse.startRealX <= (bottomLeftX + edgeSize)
                && mouse.startRealY >= (bottomLeftY - edgeSize) && mouse.startRealY <= (bottomLeftY + edgeSize)) {

                currentBbox.resizing = "bottomLeft"
            } else if (mouse.startRealX >= (topRightX - edgeSize) && mouse.startRealX <= (topRightX + edgeSize)
                && mouse.startRealY >= (topRightY - edgeSize) && mouse.startRealY <= (topRightY + edgeSize)) {

                currentBbox.resizing = "topRight"
            } else if (mouse.startRealX >= (bottomRightX - edgeSize) && mouse.startRealX <= (bottomRightX + edgeSize)
                && mouse.startRealY >= (bottomRightY - edgeSize) && mouse.startRealY <= (bottomRightY + edgeSize)) {

                currentBbox.resizing = "bottomRight"
            }

            if (currentBbox.resizing === "topLeft") {
                currentBbox.bbox.x = mouse.realX
                currentBbox.bbox.y = mouse.realY
                currentBbox.bbox.width = currentBbox.originalX + currentBbox.originalWidth - mouse.realX
                currentBbox.bbox.height = currentBbox.originalY + currentBbox.originalHeight - mouse.realY
            } else if (currentBbox.resizing === "bottomLeft") {
                currentBbox.bbox.x = mouse.realX
                currentBbox.bbox.y = mouse.realY - (mouse.realY - currentBbox.originalY)
                currentBbox.bbox.width = currentBbox.originalX + currentBbox.originalWidth - mouse.realX
                currentBbox.bbox.height = mouse.realY - currentBbox.originalY
            } else if (currentBbox.resizing === "topRight") {
                currentBbox.bbox.x = mouse.realX - (mouse.realX - currentBbox.originalX)
                currentBbox.bbox.y = mouse.realY
                currentBbox.bbox.width = mouse.realX - currentBbox.originalX
                currentBbox.bbox.height = currentBbox.originalY + currentBbox.originalHeight - mouse.realY
            } else if (currentBbox.resizing === "bottomRight") {
                currentBbox.bbox.x = mouse.realX - (mouse.realX - currentBbox.originalX)
                currentBbox.bbox.y = mouse.realY - (mouse.realY - currentBbox.originalY)
                currentBbox.bbox.width = mouse.realX - currentBbox.originalX
                currentBbox.bbox.height = mouse.realY - currentBbox.originalY
            }
        }
    }

    const changeCursorByLocation = () => {
        if (currentImage !== null) {
            const currentBboxes = bboxes[currentImage.name]

            for (let className in currentBboxes) {
                for (let i = 0; i < currentBboxes[className].length; i++) {
                    const bbox = currentBboxes[className][i]

                    const endX = bbox.x + bbox.width
                    const endY = bbox.y + bbox.height

                    if (mouse.realX >= (bbox.x + edgeSize) && mouse.realX <= (endX - edgeSize)
                        && mouse.realY >= (bbox.y + edgeSize) && mouse.realY <= (endY - edgeSize)) {

                        document.body.style.cursor = "pointer"

                        break
                    } else {
                        document.body.style.cursor = "default"
                    }
                }
            }

            if (currentBbox !== null) {
                const topLeftX = currentBbox.bbox.x
                const topLeftY = currentBbox.bbox.y
                const bottomLeftX = currentBbox.bbox.x
                const bottomLeftY = currentBbox.bbox.y + currentBbox.bbox.height
                const topRightX = currentBbox.bbox.x + currentBbox.bbox.width
                const topRightY = currentBbox.bbox.y
                const bottomRightX = currentBbox.bbox.x + currentBbox.bbox.width
                const bottomRightY = currentBbox.bbox.y + currentBbox.bbox.height

                if (mouse.realX >= (topLeftX + edgeSize) && mouse.realX <= (bottomRightX - edgeSize)
                    && mouse.realY >= (topLeftY + edgeSize) && mouse.realY <= (bottomRightY - edgeSize)) {

                    document.body.style.cursor = "move"
                } else if (mouse.realX >= (topLeftX - edgeSize) && mouse.realX <= (topLeftX + edgeSize)
                    && mouse.realY >= (topLeftY - edgeSize) && mouse.realY <= (topLeftY + edgeSize)) {
                    document.body.style.cursor = "nwse-resize"

                } else if (mouse.realX >= (bottomLeftX - edgeSize) && mouse.realX <= (bottomLeftX + edgeSize)
                    && mouse.realY >= (bottomLeftY - edgeSize) && mouse.realY <= (bottomLeftY + edgeSize)) {

                    document.body.style.cursor = "nesw-resize"
                } else if (mouse.realX >= (topRightX - edgeSize) && mouse.realX <= (topRightX + edgeSize)
                    && mouse.realY >= (topRightY - edgeSize) && mouse.realY <= (topRightY + edgeSize)) {

                    document.body.style.cursor = "nesw-resize"
                } else if (mouse.realX >= (bottomRightX - edgeSize) && mouse.realX <= (bottomRightX + edgeSize)
                    && mouse.realY >= (bottomRightY - edgeSize) && mouse.realY <= (bottomRightY + edgeSize)) {

                    document.body.style.cursor = "nwse-resize"
                }
            }
        }
    }

    const panImage= (xx, yy) => {
        if (mouse.buttonR === true) {
            canvasX -= mouse.realX - xx
            canvasY -= mouse.realY - yy

            mouse.realX = zoomXInv(mouse.x)
            mouse.realY = zoomYInv(mouse.y)
        }
    }

    const zoom = (number) => {
        return Math.floor(number * scale)
    }

    const zoomX = (number) => {
        return Math.floor((number - canvasX) * scale + screenX)
    }

    const zoomY = (number) => {
        return Math.floor((number - canvasY) * scale + screenY)
    }

    const zoomXInv = (number) => {
        return Math.floor((number - screenX) * (1 / scale) + canvasX)
    }

    const zoomYInv = (number) => {
        return Math.floor((number - screenY) * (1 / scale) + canvasY)
    }

    const listenImageLoad = () => {
        document.getElementById("images").addEventListener("change", (event) => {
            resetImageList()

            const imageList = document.getElementById("imageList")

            const files = event.target.files

            if (files.length > 0) {
                document.body.style.cursor = "wait"

                for (let i = 0; i < files.length; i++) {
                    const nameParts = files[i].name.split(".")

                    if (extensions.indexOf(nameParts[nameParts.length - 1]) !== -1) {
                        images[files[i].name] = {meta: files[i]}

                        const option = document.createElement("option")

                        option.value = files[i].name
                        option.innerHTML = files[i].name

                        if (i === 0) {
                            option.selected = true
                        }

                        imageList.appendChild(option)
                    }
                }

                const imageArray = Object.keys(images)

                let async = imageArray.length

                for (let image in images) {
                    const reader = new FileReader()

                    reader.addEventListener("load", () => {
                        const imageObject = new Image()

                        imageObject.addEventListener("load", (event) => {
                            images[image].width = event.target.width
                            images[image].height = event.target.height

                            if (--async === 0) {
                                document.body.style.cursor = "default"

                                setCurrentImage(images[imageArray[0]])

                                if (Object.keys(classes).length > 0) {
                                    document.getElementById("bboxes").disabled = false
                                    document.getElementById("restoreBboxes").disabled = false
                                }
                            }
                        })

                        imageObject.src = reader.result
                    })

                    reader.readAsDataURL(images[image].meta)
                }
            }
        })
    }

    const resetImageList = () => {
        const imageList = document.getElementById("imageList")

        imageList.innerHTML = ""

        images = {}
        bboxes = {}
        currentImage = null
    }

    const setCurrentImage = (image) => {
        const reader = new FileReader()

        reader.addEventListener("load", () => {
            const dataUrl = reader.result
            const imageObject = new Image()

            imageObject.addEventListener("load", () => {
                currentImage = {
                    name: image.meta.name,
                    object: imageObject,
                    width: image.width,
                    height: image.height
                }
            })

            imageObject.src = dataUrl
        })

        reader.readAsDataURL(image.meta)

        if (currentBbox !== null) {
            currentBbox.bbox.marked = false // We unmark via reference
            currentBbox = null // and the we delete
        }
    }

    const listenImageSelect = () => {
        const imageList = document.getElementById("imageList")

        imageList.addEventListener("change", () => {
            imageListIndex = imageList.selectedIndex

            setCurrentImage(images[imageList.options[imageListIndex].innerHTML])
        })
    }

    const listenClassLoad = () => {
        document.getElementById("classes").addEventListener("change", (event) => {
            resetClassList()

            const files = event.target.files

            if (files.length > 0) {
                const nameParts = files[0].name.split(".")

                if (nameParts[nameParts.length - 1] === "txt") {
                    const reader = new FileReader()

                    reader.addEventListener("load", () => {
                        const lines = reader.result

                        const rows = lines.split("\n")

                        if (rows.length > 0) {
                            const classList = document.getElementById("classList")

                            for (let i = 0; i < rows.length; i++) {
                                if (rows[i] !== "") {
                                    classes[rows[i]] = i

                                    const option = document.createElement("option")

                                    option.value = i
                                    option.innerHTML = rows[i]

                                    if (i === 0) {
                                        option.selected = true
                                        currentClass = rows[i]
                                    }

                                    classList.appendChild(option)
                                }
                            }

                            setCurrentClass()

                            if (Object.keys(images).length > 0) {
                                document.getElementById("bboxes").disabled = false
                                document.getElementById("restoreBboxes").disabled = false
                            }
                        }
                    })

                    reader.readAsText(files[0])
                }
            }
        })
    }

    const resetClassList = () => {
        document.getElementById("classList").innerHTML = ""

        classes = {}
        currentClass = null
    }

    const setCurrentClass = () => {
        const classList = document.getElementById("classList")

        currentClass = classList.options[classList.selectedIndex].text

        if (currentBbox !== null) {
            currentBbox.bbox.marked = false // We unmark via reference
            currentBbox = null // and the we delete
        }
    }

    const listenClassSelect = () => {
        const classList = document.getElementById("classList")

        classList.addEventListener("change", () => {
            classListIndex = classList.selectedIndex

            setCurrentClass()
        })
    }

    const listenBboxLoad = () => {
        document.getElementById("bboxes").addEventListener("change", (event) => {
            resetBboxes()

            const reader = new FileReader()

            reader.addEventListener("load", () => {
                const zip = new JSZip()

                zip.loadAsync(reader.result)
                    .then((result) => {
                        for (let filename in result.files) {
                            result.file(filename).async("string")
                                .then((text) => {
                                    let image = null
                                    let bbox = null

                                    for (let i = 0; i < extensions.length; i++) {
                                        const imageName = filename.replace(".txt", `.${extensions[i]}`)

                                        if (typeof images[imageName] !== "undefined") {
                                            image = images[imageName]

                                            if (typeof bboxes[imageName] === "undefined") {
                                                bboxes[imageName] = {}
                                            }

                                            bbox = bboxes[imageName]

                                            break
                                        }
                                    }

                                    if (bbox) {
                                        const rows = text.split("\n")

                                        for (let i = 0; i < rows.length; i++) {
                                            const cols = rows[i].split(" ")

                                            cols[0] = parseInt(cols[0])

                                            for (let className in classes) {
                                                if (classes[className] === cols[0]) {
                                                    if (typeof bbox[className] === "undefined") {
                                                        bbox[className] = []
                                                    }

                                                    // Reverse engineer actual position and dimensions from yolo format
                                                    const width = Math.floor(cols[3] * image.width)
                                                    const x = Math.floor(cols[1] * image.width)
                                                    const height = Math.floor(cols[4] * image.height)
                                                    const y = Math.floor(cols[2] * image.height)

                                                    bbox[className].push({
                                                        x: x - width * 0.5,
                                                        y: y - height * 0.5,
                                                        width: width,
                                                        height: height,
                                                        marked: false,
                                                        class: className
                                                    })

                                                    break
                                                }
                                            }
                                        }
                                    }
                                })
                        }
                    })
            })

            reader.readAsArrayBuffer(event.target.files[0])
        })
    }

    const resetBboxes = () => {
        bboxes = {}
    }

    const listenBboxSave = () => {
        document.getElementById("saveBboxes").addEventListener("click", () => {
            const zip = new JSZip()

            for (let imageName in bboxes) {
                const image = images[imageName]

                const name = imageName.split(".")

                name[name.length - 1] = "txt"

                const result = []

                for (let className in bboxes[imageName]) {
                    for (let i = 0; i < bboxes[imageName][className].length; i++) {
                        const bbox = bboxes[imageName][className][i]

                        // Prepare data for yolo format
                        const x = (bbox.x + bbox.width / 2) / image.width
                        const y = (bbox.y + bbox.height / 2) / image.height
                        const width = bbox.width / image.width
                        const height = bbox.height / image.height

                        result.push(`${classes[className]} ${x} ${y} ${width} ${height}`)
                    }
                }

                zip.file(name.join("."), result.join("\n"))
            }

            zip.generateAsync({type: "base64"})
                .then((base64) => {
                    download("labels.zip", "data:application/zip;base64," + base64)
                })
        })
    }

    const download = (name, content) => {
        const element = document.createElement("a")

        element.setAttribute("href", content)
        element.setAttribute("download", name)
        element.style.display = "none"

        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    const listenBboxRestore = () => {
        document.getElementById("restoreBboxes").addEventListener("click", () => {

            const item = localStorage.getItem("bboxes")

            if (item) {
                bboxes = JSON.parse(item)
            }
        })
    }

    const listenKeyboard = () => {
        const imageList = document.getElementById("imageList")
        const classList = document.getElementById("classList")

        document.addEventListener("keydown", (event) => {
            const key = event.keyCode || event.charCode

            if (key === 8 || key === 46) {
                if (currentBbox !== null) {
                    bboxes[currentImage.name][currentBbox.bbox.class].splice(currentBbox.index, 1)
                    currentBbox = null
                }

                event.preventDefault()
            }

            if (key === 37) {
                if (imageList.length > 1) {
                    imageList.options[imageListIndex].selected = false

                    if (imageListIndex === 0) {
                        imageListIndex = imageList.length - 1
                    } else {
                        imageListIndex--
                    }

                    imageList.options[imageListIndex].selected = true

                    setCurrentImage(images[imageList.options[imageListIndex].innerHTML])

                    document.body.style.cursor = "default"
                }

                event.preventDefault()
            }

            if (key === 39) {
                if (imageList.length > 1) {
                    imageList.options[imageListIndex].selected = false

                    if (imageListIndex === imageList.length - 1) {
                        imageListIndex = 0
                    } else {
                        imageListIndex++
                    }

                    imageList.options[imageListIndex].selected = true

                    setCurrentImage(images[imageList.options[imageListIndex].innerHTML])

                    document.body.style.cursor = "default"
                }

                event.preventDefault()
            }

            if (key === 38) {
                if (classList.length > 1) {
                    classList.options[classListIndex].selected = false

                    if (classListIndex === 0) {
                        classListIndex = classList.length - 1
                    } else {
                        classListIndex--
                    }

                    classList.options[classListIndex].selected = true

                    setCurrentClass()
                }

                event.preventDefault()
            }

            if (key === 40) {
                if (classList.length > 1) {
                    classList.options[classListIndex].selected = false

                    if (classListIndex === classList.length - 1) {
                        classListIndex = 0
                    } else {
                        classListIndex++
                    }

                    classList.options[classListIndex].selected = true

                    setCurrentClass()
                }

                event.preventDefault()
            }
        })
    }
})()
