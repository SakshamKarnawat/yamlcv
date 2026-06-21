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
import argparse
import re

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

_INLINE_RE = re.compile(r'\*\*(.+?)\*\*|\*(.+?)\*')

def format_inline(text):
    """Parse **bold** and *italic* markers into LaTeX."""
    parts = []
    last = 0
    for m in _INLINE_RE.finditer(text):
        parts.append(escape(text[last:m.start()]))
        if m.group(1) is not None:
            parts.append(rf'\textbf{{{escape(m.group(1))}}}')
        else:
            parts.append(rf'\textit{{{escape(m.group(2))}}}')
        last = m.end()
    parts.append(escape(text[last:]))
    return ''.join(parts)

def normalizeUrl(u):
    if not u:
        return ""
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return "https://" + u

def build_heading(h, opts):
    icons = opts.get('icons', True)

    contact_parts = []
    if h.get('phone'):
        icon = r"\faPhone\ " if icons else ""
        phone = h['phone']
        contact_parts.append(
            f"{icon}\\href{{tel:{phone}}}{{\\underline{{{escape(phone)}}}}}"
        )
    if h.get('email'):
        icon = r"\faEnvelope\ " if icons else ""
        email = h['email']
        contact_parts.append(
            f"{icon}\\href{{mailto:{email}}}{{\\underline{{{escape(email)}}}}}"
        )
    if h.get('linkedin'):
        icon = r"\faLinkedin\ " if icons else ""
        linkedin = normalizeUrl(h['linkedin'])
        label = linkedin.rstrip('/').split('/')[-1]
        contact_parts.append(
            f"{icon}\\href{{{linkedin}}}{{\\underline{{{escape(label)}}}}}"
        )
    if h.get('github'):
        icon = r"\faGithub\ " if icons else ""
        github = normalizeUrl(h['github'])
        label = github.rstrip('/').split('/')[-1]
        contact_parts.append(
            f"{icon}\\href{{{github}}}{{\\underline{{{escape(label)}}}}}"
        )
    if h.get('website'):
        icon = r"\faGlobe\ " if icons else ""
        website = normalizeUrl(h['website'])
        contact_parts.append(
            f"{icon}\\href{{{website}}}{{\\underline{{{escape(website)}}}}}"
        )

    contact_line = ""
    if contact_parts:
        contact_line = rf" \\ \vspace{{4pt}}\small {" $|$ ".join(contact_parts)}"

    title_line = ""
    if h.get('title'):
        size = opts.get('title_size', 'medium')
        size_cmd = {
            'small': r'\small\textit',
            'medium': r'\large\textit',
            'large': r'\Large\textit',
        }.get(size, r'\large\textit')
        title_line = rf"\\ \vspace{{2pt}}{size_cmd}{{{escape(h['title'])}}}"

    summary_line = ""
    if h.get('summary'):
        summary_line = rf"\\ \vspace{{4pt}}\small {escape(h['summary'])}"

    return rf"""
\begin{{center}}
    \textbf{{\Huge \scshape {escape(h['name'])}}} {title_line}{summary_line}{contact_line}
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
            rf"        \resumeItem{{{format_inline(b)}}}" for b in e['bullets']
        )

        link_parts = []
        for link in e.get('links') or []:
            url = normalizeUrl(link.get('url', ''))
            if not url:
                continue
            label = link.get('text') or url
            link_parts.append(
                rf"\href[pdfnewwindow=true]{{{url}}}{{\underline{{{escape(label)}}}}}"
            )

        rows = [
            rf"      \textbf{{{escape(e['title'])}}} & {escape(e.get('dates', ''))} \\",
        ]
        company = e.get('company', '')
        location = e.get('location', '')
        if company or location:
            rows.append(
                rf"      \textit{{\small {escape(company)}}} & \textit{{\small {escape(location)}}} \\"
            )
        if link_parts:
            rows.append(
                rf"      \textit{{\small Projects: {" $|$ ".join(link_parts)}}} & \\"
            )

        items += rf"""
    \vspace{{-2pt}}\item
    \begin{{tabular*}}{{0.97\textwidth}}[t]{{l@{{\extracolsep{{\fill}}}}r}}
{chr(10).join(rows)}
    \end{{tabular*}}\vspace{{-7pt}}
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
    for p in proj_list:
        bullets = "\n".join(
            rf"        \resumeItem{{{format_inline(b)}}}" for b in p['bullets']
        )

        # build links line separately
        links_line = ""
        link_parts = []
        if p.get('demo'):
            link_parts.append(rf"\href{{{escape(p['demo'])}}}{{\underline{{Demo}}}}")
        if p.get('repo'):
            link_parts.append(rf"\href{{https://{escape(p['repo'])}}}{{\underline{{Repo}}}}")
        
        if link_parts:
            links_line = rf"""
            \item
            \begin{{tabular*}}{{0.97\textwidth}}{{l@{{\extracolsep{{\fill}}}}r}}
            \textit{{\small {" $|$ ".join(link_parts)}}} & \\
            \end{{tabular*}}\vspace{{-4pt}}"""

        items += rf"""
            \resumeProjectHeading
            {{\textbf{{{escape(p['name'])}}} $|$ \emph{{{escape(p['stack'])}}}}}{{{escape(p['dates'])}}}\vspace{{-4pt}}
            {links_line}
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

DEFAULT_SECTION_ORDER = ['experience', 'education', 'projects', 'skills']

SECTION_BUILDERS = {
    'experience': lambda data: build_experience(data['experience']),
    'education': lambda data: build_education(data['education']),
    'projects': lambda data: build_projects(data['projects']) if data.get('projects') else '',
    'skills': lambda data: build_skills(data['skills']),
}

def build_sections(data, opts):
    order = opts.get('section_order') or DEFAULT_SECTION_ORDER
    tex = ""
    for key in order:
        builder = SECTION_BUILDERS.get(key)
        if builder:
            tex += builder(data)
    return tex

def build_preamble(opts):
    font = opts.get('font', 'charter')
    color_links = opts.get('color_links', False)
    xelatex = font == 'outfit'

    font_pkg = ""
    if font == "charter":
        font_pkg = r"\usepackage{charter}"
    elif font == "times":
        font_pkg = r"\usepackage{times}"
    elif font == "lato":
        font_pkg = r"\usepackage[default]{lato}"
    elif font == "inter":
        font_pkg = r"\usepackage[sfdefault]{inter}"
    elif font == "sourcesanspro":
        font_pkg = r"\usepackage[default]{sourcesanspro}"
    elif font == "roboto":
        font_pkg = r"\usepackage[sfdefault]{roboto}"
    elif font == "outfit":
        font_pkg = r"""\usepackage{fontspec}
\setmainfont{Outfit}[
  Path=../templates/jake/fonts/,
  UprightFont={Outfit-Variable.ttf},
  BoldFont={Outfit-Variable.ttf},
  UprightFeatures={RawFeature={+wght=400}},
  BoldFeatures={RawFeature={+wght=600}},
]"""
    # default = computer modern, no package needed

    glyphtounicode = "" if xelatex else r"\input{glyphtounicode}"

    hyperref = r"\usepackage[hidelinks]{hyperref}"
    if color_links:
        hyperref = r"""\definecolor{softlink}{RGB}{29, 78, 216}
\usepackage[colorlinks=true,linkcolor=softlink,urlcolor=softlink]{hyperref}"""

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
{glyphtounicode}
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

def check_page_overflow(output_dir):
    log_file = os.path.join(output_dir, "resume.log")
    if not os.path.exists(log_file):
        return None
    with open(log_file, "r", errors="ignore") as f:
        content = f.read()
    # latexmk log contains "Output written on resume.pdf (N pages"
    match = re.search(r"Output written on.*?\((\d+) page", content)
    if match:
        pages = int(match.group(1))
        if pages > 1:
            return pages
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--details', default=None)
    parser.add_argument('--watch', action='store_true')
    args, _ = parser.parse_known_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    details_path = args.details if args.details else os.path.join(script_dir, "details.yml")

    with open(details_path, "r") as f:
        try:
            data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"✗ Invalid YAML: {e}", file=sys.stderr)
            sys.exit(1)

    if not data:
        print("✗ Empty details.yml", file=sys.stderr)
        sys.exit(1)

    opts = data.get('options', {})

    uses_fontspec = opts.get('font', '') == 'outfit'
    latex_engine = "xelatex" if uses_fontspec else "pdflatex"

    tex = build_preamble(opts)
    tex += "\n\\begin{document}\n"
    tex += build_heading(data['heading'], opts)
    tex += build_sections(data, opts)
    tex += "\n\\end{document}\n"

    output_dir = os.path.join(os.getcwd(), "generated")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "resume.tex")

    with open(output_file, "w") as f:
        f.write(tex)

    print(f"✓ {output_file} generated")

    result = subprocess.run(
        ["latexmk", f"-{latex_engine}", "-interaction=nonstopmode", output_file],
        cwd=output_dir,
        capture_output=True
    )

    pages = check_page_overflow(output_dir)
    if pages:
        print(f"⚠️  Resume is {pages} pages — consider trimming to fit 1 page", file=sys.stderr)
        sys.exit(2)  # exit code 2 = warning (PDF still generated)

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