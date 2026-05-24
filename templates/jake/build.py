#!/usr/bin/env python3
# /// script
# dependencies = ["pyyaml", "watchdog"]
# ///
"""
build.py — generates resume_{name}.tex from details.yml
Usage:       uv run templates/jake/build.py
Watch mode:  uv run templates/jake/build.py --watch
"""

import yaml
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time
import sys
import subprocess

def escape(text):
    """Escape special LaTeX characters."""
    replacements = {
        '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#',
        '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}',
        '^': r'\^{}',
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text

def build_heading(h, opts):
    icons = opts.get('icons', True)

    phone_icon   = r"\faPhone\ "      if icons else ""
    email_icon   = r"\faEnvelope\ "   if icons else ""
    li_icon      = r"\faLinkedin\ "   if icons else ""
    gh_icon      = r"\faGithub\ "     if icons else ""
    web_icon     = r"\faGlobe\ "      if icons else ""

    links = rf"{phone_icon}\href{{tel:{h['phone']}}}{{\underline{{{escape(h['phone'])}}}}} $|$ {email_icon}\href{{mailto:{h['email']}}}{{\underline{{{escape(h['email'])}}}}} $|$ {li_icon}\href{{https://{h['linkedin']}}}{{\underline{{{escape(h['linkedin'])}}}}} $|$ {gh_icon}\href{{https://{h['github']}}}{{\underline{{{escape(h['github'])}}}}}"

    if h.get('website'):
        links += rf" $|$ {web_icon}\href{{https://{h['website']}}}{{\underline{{{escape(h['website'])}}}}}"

    title_line = ""
    if h.get('title'):
        title_line = rf"\\ \vspace{{2pt}}\small\textit{{{escape(h['title'])}}}"

    summary_line = ""
    if h.get('summary'):
        summary_line = rf"\\ \vspace{{4pt}}\small {escape(h['summary'])}"

    return rf"""
\begin{{center}}
    \textbf{{\Huge \scshape {escape(h['name'])}}} {title_line}{summary_line} \\ \vspace{{4pt}}
    \small {links}
\end{{center}}
"""

def build_education(edu_list):
    items = ""
    for e in edu_list:
        items += rf"""
    \resumeSubheading
      {{{escape(e['institution'])}}}{{{escape(e['location'])}}}
      {{{escape(e['degree'])}}}{{{escape(e['dates'])}}}"""
    return rf"""
\section{{Education}}
  \resumeSubHeadingListStart{items}
  \resumeSubHeadingListEnd
"""

def build_experience(exp_list):
    items = ""
    for e in exp_list:
        bullets = "\n".join(
            rf"        \resumeItem{{{escape(b)}}}" for b in e['bullets']
        )
        items += rf"""
    \resumeSubheading
      {{{escape(e['title'])}}}{{{escape(e['dates'])}}}
      {{{escape(e['company'])}}}{{{escape(e['location'])}}}
      \resumeItemListStart
{bullets}
      \resumeItemListEnd
"""
    return rf"""
\section{{Experience}}
  \resumeSubHeadingListStart{items}
  \resumeSubHeadingListEnd
"""

def build_projects(proj_list):
    items = ""
    print(proj_list)
    for p in proj_list:
        bullets = "\n".join(
            rf"        \resumeItem{{{escape(b)}}}" for b in p['bullets']
        )
        items += rf"""
    \resumeProjectHeading
      {{\textbf{{{escape(p['name'])}}} $|$ \emph{{{escape(p['stack'])}}}}}{{{escape(p['dates'])}}}
      \resumeItemListStart
{bullets}
      \resumeItemListEnd
"""
    return rf"""
\section{{Projects}}
  \resumeSubHeadingListStart{items}
  \resumeSubHeadingListEnd
"""

def build_skills(skills):
    lines = " \\\\\n".join(
        rf"     \textbf{{{escape(k)}}}{{: {escape(v)}}}"
        for k, v in skills.items()
    )
    return rf"""
\section{{Technical Skills}}
  \begin{{itemize}}[leftmargin=0.15in, label={{}}]
    \small{{\item{{
{lines}
    }}}}
  \end{{itemize}}
"""

def build_preamble(opts):
    font = opts.get('font', 'charter')
    color_links = opts.get('color_links', False)

    font_pkg = ""
    if font == "charter":
        font_pkg = r"\usepackage{charter}"
    elif font == "times":
        font_pkg = r"\usepackage{times}"
    # default = computer modern, no package needed

    hyperref = r"\usepackage[hidelinks]{hyperref}" if not color_links else \
               r"\usepackage[colorlinks=true,urlcolor=blue]{hyperref}"

    return rf"""\documentclass[letterpaper,11pt]{{article}}

\usepackage{{latexsym}}
\usepackage[empty]{{fullpage}}
\usepackage{{titlesec}}
\usepackage{{marvosym}}
\usepackage[usenames,dvipsnames]{{color}}
\usepackage{{verbatim}}
\usepackage{{enumitem}}
{hyperref}
\usepackage{{fancyhdr}}
\usepackage[english]{{babel}}
\usepackage{{tabularx}}
\usepackage{{fontawesome5}}
\input{{glyphtounicode}}
{font_pkg}

\pagestyle{{fancy}}
\fancyhf{{}}
\fancyfoot{{}}
\renewcommand{{\headrulewidth}}{{0pt}}
\renewcommand{{\footrulewidth}}{{0pt}}

\addtolength{{\oddsidemargin}}{{-0.5in}}
\addtolength{{\evensidemargin}}{{-0.5in}}
\addtolength{{\textwidth}}{{1in}}
\addtolength{{\topmargin}}{{-.5in}}
\addtolength{{\textheight}}{{1.0in}}

\urlstyle{{same}}
\raggedbottom
\raggedright
\setlength{{\tabcolsep}}{{0in}}

\titleformat{{\section}}{{
  \vspace{{-4pt}}\scshape\raggedright\large
}}{{}}{{0em}}{{}}[\color{{black}}\titlerule \vspace{{-5pt}}]

\pdfgentounicode=1

\newcommand{{\resumeItem}}[1]{{
  \item\small{{{{#1 \vspace{{-2pt}}}}}}
}}
\newcommand{{\resumeSubheading}}[4]{{
  \vspace{{-2pt}}\item
    \begin{{tabular*}}{{0.97\textwidth}}[t]{{l@{{\extracolsep{{\fill}}}}r}}
      \textbf{{#1}} & #2 \\
      \textit{{\small#3}} & \textit{{\small #4}} \\
    \end{{tabular*}}\vspace{{-7pt}}
}}
\newcommand{{\resumeSubSubheading}}[2]{{
    \item
    \begin{{tabular*}}{{0.97\textwidth}}{{l@{{\extracolsep{{\fill}}}}r}}
      \textit{{\small#1}} & \textit{{\small #2}} \\
    \end{{tabular*}}\vspace{{-7pt}}
}}
\newcommand{{\resumeProjectHeading}}[2]{{
    \item
    \begin{{tabular*}}{{0.97\textwidth}}{{l@{{\extracolsep{{\fill}}}}r}}
      \small#1 & #2 \\
    \end{{tabular*}}\vspace{{-7pt}}
}}
\newcommand{{\resumeSubItem}}[1]{{\resumeItem{{#1}}\vspace{{-4pt}}}}
\renewcommand\labelitemii{{$\vcenter{{\hbox{{\tiny$\bullet$}}}}$}}
\newcommand{{\resumeSubHeadingListStart}}{{\begin{{itemize}}[leftmargin=0.15in, label={{}}]}}
\newcommand{{\resumeSubHeadingListEnd}}{{\end{{itemize}}}}
\newcommand{{\resumeItemListStart}}{{\begin{{itemize}}}}
\newcommand{{\resumeItemListEnd}}{{\end{{itemize}}\vspace{{-5pt}}}}
"""

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    with open(os.path.join(script_dir, "details.yml"), "r") as f:
        data = yaml.safe_load(f)

    opts = data.get('options', {})

    tex = build_preamble(opts)
    tex += "\n\\begin{document}\n"
    tex += build_heading(data['heading'], opts)
    tex += build_education(data['education'])
    tex += build_experience(data['experience'])
    if data.get('projects'):
        tex += build_projects(data['projects'])
    tex += build_skills(data['skills'])
    tex += "\n\\end{document}\n"

    output_dir = os.path.join(os.getcwd(), "generated")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "resume.tex")

    with open(output_file, "w") as f:
        f.write(tex)

    print(f"✓ {output_file} generated")

    subprocess.Popen(
        ["latexmk", "-pdf", "-interaction=nonstopmode", output_file],
        cwd=output_dir
    )
    print("✓ PDF build triggered")

class YMLHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith("details.yml"):
            print("↻ details.yml changed, rebuilding...")
            main()

if __name__ == "__main__":
    if "--watch" in sys.argv:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        observer = Observer()
        observer.schedule(YMLHandler(), path=script_dir, recursive=False)
        observer.start()
        print("👀 Watching details.yml... (Ctrl+C to stop)")
        main()  # build once on start
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()
    else:
        main()