function showText(){
	document.getElementById("input-area").innerHTML = `
	<form method="POST" action="/add_text">
		<h3>Create Text Post</h3>
		<textarea name="text" placeholder="Write something..."></textarea>

		<select name="folder_id" id="postFolder"></select>

		<button type="submit">Save Text</button>
	</form>
	`

	loadFolderOptions("postFolder")
}

function showTable(){
	document.getElementById("input-area").innerHTML = `
	<h3>Create Table</h3>
	Rows:
	<input type="number" id="rows" min="1">
	Columns:
	<input type="number" id="cols" min="1">
	<button onclick="generateTable()">Generate Table</button>
	<form method="POST" action="/add_table">
		<input type="hidden" name="table_data" id="tableData">
		Folder:
		<select name="folder_id" id="tableFolder"></select>
		<div id="tableContainer"></div>
		<button type="submit" onclick="saveTable()">Save Table</button>
	</form>
	`
	loadFolderOptions("tableFolder")
}

function generateTable(){
	let rows = document.getElementById("rows").value
	let cols = document.getElementById("cols").value
	let html = "<table class='generated-table'>"
	for(let r=0;r<rows;r++){
		html += "<tr>"
		for(let c=0;c<cols;c++){
			html += "<td contenteditable='true'> </td>"
		}
		html += "</tr>"
	}
	html += "</table>"
	document.getElementById("tableContainer").innerHTML = html
}

function saveTable(){
	let table = document.querySelector("#tableContainer table")
	let data = []
	for(let r=0;r<table.rows.length;r++){
		let row = []
		for(let c=0;c<table.rows[r].cells.length;c++){
			row.push(table.rows[r].cells[c].innerText)
		}
		data.push(row)
	}
	document.getElementById("tableData").value = JSON.stringify(data)
}

function showPhoto(){
	document.getElementById("input-area").innerHTML = `
	<form method="POST" action="/add_photo" enctype="multipart/form-data">
		<h3>Upload Photo</h3>
		<input type="file" name="photo">
		<input name="caption" placeholder="Caption">
		<select name="folder_id" id="photoFolder"></select>
		<button type="submit">Upload Photo</button>
	</form>
	`
	loadFolderOptions("photoFolder")
}

function showVideo(){
	document.getElementById("input-area").innerHTML = `
	<form method="POST" action="/add_video" enctype="multipart/form-data">
		<h3>Upload Video</h3>
		<input type="file" name="video">
		<input name="caption" placeholder="Caption">
		<select name="folder_id" id="videoFolder"></select>
		<button type="submit">Upload Photo</button>
	</form>
	`
	loadFolderOptions("videoFolder")
}

function randomPost(){
	fetch("/random_post")
	.then(res => res.json())
	.then(post => {
		document.getElementById("result").innerHTML = renderPost(post)
	})
}

function searchText(){
	let q = document.getElementById("search").value
	fetch("/search_text?q=" + q)
	.then(res => res.json())
	.then(data => {
		let html=""
		data.forEach(t => html += "<p>"+t+"</p>")
		document.getElementById("results").innerHTML = html
	})
}

function loadFolders(){
	fetch("/folders")
	.then(res => res.json())
	.then(data => {

		const container = document.getElementById("folders")
		container.innerHTML = ""

		container.appendChild(renderFolderTree(data))

		populateParentDropdown(data) // keep this
	})
}

loadFolders()

function deleteFolder(id){
	if(!confirm("Delete this folder?")) return
	fetch("/delete_folder/" + id)
	.then(() => loadFolders())
}

function renameFolder(id, currentName){
	let newName = prompt("New folder name:", currentName)
	if(!newName) return
	fetch("/rename_folder",{
		method:"POST",
		headers:{
			"Content-Type":"application/x-www-form-urlencoded"
		},
		body:`id=${id}&name=${encodeURIComponent(newName)}`
	})
	.then(()=>loadFolders())
}

function editTimestamp(event, postId, current){
	if(!event.shiftKey) return
	let newTime = prompt("Edit timestamp:", current)
	if(!newTime) return
	fetch("/edit_timestamp",{
		method:"POST",
		headers:{
			"Content-Type":"application/x-www-form-urlencoded"
		},
		body:`id=${postId}&time=${encodeURIComponent(newTime)}`
	})
	.then(()=>location.reload())
}

function editPost(id, content, caption){
	let newContent = prompt("Edit content:", content)
	let newCaption = prompt("Edit caption:", caption)
	fetch("/update_post",{
		method:"POST",
		headers:{
			"Content-Type":"application/x-www-form-urlencoded"
		},
		body:`id=${id}&content=${encodeURIComponent(newContent)}&caption=${encodeURIComponent(newCaption)}`
	})
	.then(()=>location.reload())
}

function deletePost(id){
	if(!confirm("Delete this post?")) return
	fetch("/delete_post_ajax/" + id)
	.then(()=>location.reload())
}

function toggleMenu(){
	let sidebar = document.getElementById("sidebar")
	sidebar.classList.toggle("open")
}

function goHome(){
	window.location.reload();
}

function renderPost(post, query=""){
	let id = post[0]
	let type = post[1]
	let content = post[2]
	let caption = post[3]
	let time = post[4]
	let html = ""
	if(type=="text"){
		html = `
		<div class="post">
			<p>${highlightText(content, query)}</p>
			<div class="timestamp">${time}</div>
			<div class="post-actions">
				<button onclick="movePost(${id})">📁 Move</button>
				<button onclick="editPost(${id}, \`${content}\`, \`${caption}\`)">✏️</button>
				<button onclick="deletePost(${id})">🗑️</button>
			</div>
		</div>
		`
	}
	if(type=="photo"){
		html = `
		<div class="post">
			<div class="caption">
				${highlightText(caption || "", query)}
			</div>
			<img src="${content}">
			<div class="timestamp">${time}</div>
			<div class="post-actions">
				<button onclick="movePost(${id})">📁 Move</button>
				<button onclick="editPost(${id}, \`${content}\`, \`${caption}\`)">✏️</button>
				<button onclick="deletePost(${id})">🗑️</button>
			</div>
		</div>
		`
	}
	if(type=="video"){
		html = `
		<div class="post">
			<video controls src="${content}"></video>
			<p>${highlightText(caption || "", query)}</p>
			<div class="timestamp">${time}</div>
			<div class="post-actions">
				<button onclick="movePost(${id})">📁 Move</button>
				<button onclick="editPost(${id}, \`${content}\`, \`${caption}\`)">✏️</button>
				<button onclick="deletePost(${id})">🗑️</button>
			</div>
		</div>
		`
	}
	if(type=="table"){
		let tableData = JSON.parse(content)
		let tableHtml = "<table class='feed-table'>"
		tableData.forEach(row => {
			tableHtml += "<tr>"
			row.forEach(cell => {
				tableHtml += "<td>"+highlightText(cell, query)+"</td>"
			})
			tableHtml += "</tr>"
		})
		tableHtml += "</table>"
		html = `
		<div class="post">
			${tableHtml}
			<div class="timestamp">${time}</div>
			<div class="post-actions">
				<button onclick="movePost(${id})">📁 Move</button>
				<button onclick="editPost(${id}, \`${content}\`, \`${caption}\`)">✏️</button>
				<button onclick="deletePost(${id})">🗑️</button>
			</div>
		</div>
		`
	}
	return html
}

function chooseFolder(){
	fetch("/folders")
	.then(res => res.json())
	.then(data => {
		let html = `
		<input id="searchText" placeholder="Search text or caption">
		<button onclick="searchPosts()">Search</button>
		<div id="searchResults"></div>
		`
		document.getElementById("result").innerHTML = html
	})
}

function searchPosts(){
	let q = document.getElementById("searchText").value
	fetch(`/search_posts?q=${encodeURIComponent(q)}`)
	.then(res => res.json())
	.then(data => {
		let html = ""
		if(data.length === 0){
			html = "<p>No posts found</p>"
		}else{
			data.forEach(post => {
				html += renderPost(post, q)
			})
		}
		document.getElementById("searchResults").innerHTML = html
	})
}

function populateParentDropdown(folders) {
  const select = document.querySelector("[name='parent_id']");
  if(!select) return; // 🔥 prevents crash

  select.innerHTML = '<option value="">No Parent</option>';

  folders.forEach(folder => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.name || "(Unnamed)";
    select.appendChild(option);
  });
}

function renderFolderTree(folders, parentId = null){

	const ul = document.createElement("ul")

	folders
		.filter(f => f.parent_id === parentId)
		.forEach(folder => {

			const li = document.createElement("li")

			const hasChildren = folders.some(f => f.parent_id === folder.id)

			const item = document.createElement("div")
			item.className = "folder-item"
			item.innerHTML = `📁 ${folder.name || "(Unnamed)"}`

			li.appendChild(item)

			// 🔥 define children OUTSIDE
			let children = null

			if(hasChildren){
				children = renderFolderTree(folders, folder.id)
				children.style.display = "none"
				li.appendChild(children)
			}

			// ✅ unified click
			item.onclick = () => {
				openFolderById(folder.id)

				if(children){
					children.style.display =
						children.style.display === "none" ? "block" : "none"
				}
			}

			ul.appendChild(li)
		})

	return ul
}

let currentFolderId = null
let currentPage = 1

function openFolderById(folderId, page=1){

	currentFolderId = folderId
	currentPage = page

	fetch(`/folder_posts?folder_id=${folderId}&page=${page}`)
	.then(res => res.json())
	.then(data => {

		let html = ""

		data.posts.forEach(post => {
			html += renderPost(post)
		})

		let totalPages = Math.ceil(data.total / data.per_page)

		html += `<div class="pagination">`

		if(page > 1){
			html += `<button onclick="openFolderById(${folderId}, ${page-1})">Previous</button>`
		}

		for(let i=1;i<=totalPages;i++){
			if(i == page){
				html += `<button class="active">${i}</button>`
			}else{
				html += `<button onclick="openFolderById(${folderId}, ${i})">${i}</button>`
			}
		}

		if(page < totalPages){
			html += `<button onclick="openFolderById(${folderId}, ${page+1})">Next</button>`
		}

		html += `<button onclick="openFolderById(${folderId}, ${totalPages})">Last</button>`
		html += `</div>`

		document.getElementById("result").innerHTML = html
	})
}

function loadFolderOptions(selectId){
	fetch("/folders")
	.then(res => res.json())
	.then(folders => {

		const select = document.getElementById(selectId)
		select.innerHTML = ""

		folders.forEach(folder => {
			const option = document.createElement("option")
			option.value = folder.id   // ✅ IMPORTANT
			option.textContent = folder.name || "(Unnamed)"
			select.appendChild(option)
		})
	})
}

let movingPostId = null

function movePost(postId){
	movingPostId = postId

	fetch("/folders")
	.then(res => res.json())
	.then(folders => {

		let select = document.getElementById("moveFolderSelect")
		select.innerHTML = ""

		folders.forEach(f => {
			let option = document.createElement("option")
			option.value = f.id
			option.textContent = f.name
			select.appendChild(option)
		})

		document.getElementById("moveModal").style.display = "flex"
	})
}

function confirmMove(){
	let folderId = document.getElementById("moveFolderSelect").value

	fetch("/move_post", {
		method:"POST",
		headers:{
			"Content-Type":"application/x-www-form-urlencoded"
		},
		body:`post_id=${movingPostId}&folder_id=${folderId}`
	})
	.then(()=>{
		closeMoveModal()
		location.reload()
	})
}

function closeMoveModal(){
	document.getElementById("moveModal").style.display = "none"
}

function highlightText(text, query){
	if(!query) return text

	let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

	// 🔥 match whole or partial words cleanly without breaking layout
	let regex = new RegExp(`(${escaped})`, "gi")

	return text.replace(regex, (match) => `<mark>${match}</mark>`)
}