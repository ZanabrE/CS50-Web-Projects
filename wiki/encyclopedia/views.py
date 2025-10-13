from django.shortcuts import render
from markdown2 import Markdown
import markdown 

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
        "entries": util.list_entries()
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