let currentPage = 1

function loadFeed(page=1){
	fetch("/feed_posts?page=" + page)
	.then(res => res.json())
	.then(data => {
		let html = ""
		data.posts.forEach(post => {
			html += renderPost(post)
		})
		document.getElementById("posts").innerHTML = html
		renderPagination(data.total, data.per_page, data.page)
	})
}

loadFeed(1)
loadFolders()

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
		</div>
		`
	}
	if(type=="video"){
		html = `
		<div class="post">
			<video controls src="${content}"></video>
			<p>${highlightText(caption || "", query)}</p>
			<div class="timestamp">${time}</div>
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
		</div>
		`
	}
	return html
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

			let children = null

			if(hasChildren){
				children = renderFolderTree(folders, folder.id)
				children.style.display = "none"

				item.onclick = () => {
					children.style.display =
						children.style.display === "none" ? "block" : "none"
				}

				li.appendChild(children)
			}else{
				item.onclick = () => openFolderById(folder.id)
			}

			ul.appendChild(li)
		})

	return ul
}

function openFolderById(folderId, page=1){

	document.getElementById("sidebar").classList.remove("open")

	fetch(`/folder_posts?folder_id=${folderId}&page=${page}`)
	.then(res => res.json())
	.then(data => {

		let html = ""

		data.posts.forEach(post => {
			html += renderPost(post)
		})

		// ✅ FIRST set posts
		document.getElementById("posts").innerHTML = html

		// ✅ THEN add pagination
		renderFolderPagination(data.total, data.per_page, data.page, folderId)
	})
}

function randomPost(){
	fetch("/random_post")
	.then(res => res.json())
	.then(post => {
		document.getElementById("posts").innerHTML = renderPost(post)
	})
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
		document.getElementById("posts").innerHTML = html
	})
}

function loadSelectedFolder(){
	let folder = document.getElementById("folderSelect").value
	openFolder(folder)
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

function goHome(){
	let searchResults = document.getElementById("searchResults")
	if(searchResults){
		searchResults.innerHTML=""
	}
	currentPage = 1
	loadFeed(1)
}

function renderFolderPagination(total, per_page, page, folderId){

	let totalPages = Math.ceil(total / per_page)
	let html = "<div class='pagination'>"

	if(page > 1){
		html += `<button onclick="openFolderById(${folderId}, ${page-1})">Previous</button>`
	}

	for(let i=1;i<=totalPages;i++){
		if(i==page){
			html += `<button class="active">${i}</button>`
		}else{
			html += `<button onclick="openFolderById(${folderId}, ${i})">${i}</button>`
		}
	}

	if(page < totalPages){
		html += `<button onclick="openFolderById(${folderId}, ${page+1})">Next</button>`
	}

	html += `<button onclick="openFolderById(${folderId}, ${totalPages})">Last</button>`
	html += "</div>"

	document.getElementById("posts").innerHTML += html
}

function toggleMenu(){
	let sidebar = document.getElementById("sidebar")
	sidebar.classList.toggle("open")
}

document.addEventListener("click", function(e){
	let sidebar = document.getElementById("sidebar")
	let menuBtn = document.querySelector(".menu-btn")
	if(!sidebar.contains(e.target) && !menuBtn.contains(e.target)){
		sidebar.classList.remove("open")
	}
})

function renderPagination(total, per_page, page){
	let totalPages = Math.ceil(total / per_page)
	let html = "<div class='pagination'>"
	if(page > 1){
		html += `<button onclick="loadFeed(${page-1})">Previous</button>`
	}
	for(let i=1;i<=totalPages;i++){
		if(i == page){
			html += `<button class="active">${i}</button>`
		}else{
			html += `<button onclick="loadFeed(${i})">${i}</button>`
		}
	}
	if(page < totalPages){
		html += `<button onclick="loadFeed(${page+1})">Next</button>`
	}
	html += `<button onclick="loadFeed(${totalPages})">Last</button>`
	html += "</div>"
	document.getElementById("posts").innerHTML += html
}

function loadFolders(){
	fetch("/folders")
	.then(res => res.json())
	.then(data => {
		const container = document.getElementById("folders")
		container.innerHTML = ""

		container.appendChild(renderFolderTree(data))
	})
}

function highlightText(text, query){
	if(!query) return text

	let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

	// 🔥 match whole or partial words cleanly without breaking layout
	let regex = new RegExp(`(${escaped})`, "gi")

	return text.replace(regex, (match) => `<mark>${match}</mark>`)
}

let tapCount = 0
let tapTimer = null
