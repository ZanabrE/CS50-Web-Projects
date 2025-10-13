from django.shortcuts import render
from markdown2 import markdown
import markdown 

from . import util


def convert_md_to_html(title):
    content: util.get_entry(title)
    markdowner = markdown.Mardown()
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

