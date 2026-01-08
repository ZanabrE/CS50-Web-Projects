from django.shortcuts import render
from markdown2 import Markdown
import markdown
import random

from . import util


def convert_md_to_html(title):
    content = util.get_entry(title)
    markdowner = markdown.Markdown()
    if content == None:
        return None
    else:
        return markdowner.convert(content)


def index(request):
    entries = util.list_entries()
    return render(request, "encyclopedia/index.html", {
        "entries": entries
    })

def entry(request, title):
    html_page = convert_md_to_html(title)
    if html_page == None:
        return render(request, "encyclopedia/error.html", {
            "message": "The requested page was not found."
        })
    else:
        return render(request, "encyclopedia/entry.html", {
            "title": title,
            "content": html_page
        })

def search(request):
    entries = util.list_entries()
    if request.method == "POST":
        entry_search = request.POST['q']
        html_page = convert_md_to_html(entry_search)
        if html_page == None:
            return render(request, "encyclopedia/search.html", {
                "entries": entries
            })
        else:
            allEntries = util.list_entries()
            extensions = []
            for entry in allEntries:
                if entry_search.lower() in entry.lower():
                    extensions.append(entry)
            return render(request, "encyclopedia/entry.html", {
                "entries": util.list_entries(),
                "title": entry_search,
                "content": html_page
            })

def new_page(request):
    if request.method == "GET":
        return render(request, "encyclopedia/new.html")
    else:
        title = request.POST['title']
        content = request.POST['content']
        titleExist = util.get_entry(title)
        if titleExist == None:
            return render(request, "encyclopedia/error.html", {
                "message": "Page already exists."
            })
        else:
            util.save_entry(title, content)
            html_page = convert_md_to_html(title)
            return render(request, "encyclopedia/entry.html", {
                "title": title,
                "content": html_page
            })

def edit(request):
    if request.method == "POST":
        title = request.POST['entry']
        content = util.get_entry(title)
        return render(request, "encyclopedia/edit.html", {
            "title": title,
            "content": content
        })
    else:
        return render(request, "encyclopedia/error.html", {
            "message": "An error occurred."
        })
        
def save_entry(request):
    if request.method == "POST":
        title = request.POST['title']
        content = request.POST['content']
        util.save_entry(title, content)
        html_page = convert_md_to_html(title)
        return render(request, "encyclopedia/entry.html", {
            "title": title,
            "content": html_page
        })

def random_page(request):
    allEntries = util.list_entries()
    randomEntry = random.choice(allEntries)
    html_page = convert_md_to_html(randomEntry)
    return render(request, "encyclopedia/entry.html", {
        "title": randomEntry,
        "content": html_page
    })
