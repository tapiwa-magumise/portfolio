# Decisions

Each choice, the alternative it was weighed against, and what it costs.

## Plain JavaScript and SVG, no framework

The drawing needs its own layout, a pen that draws lines in order and a camera; no diagram library does that, and a framework would add a build step without helping with any of it. The files in the repository are the files that are served, so anyone can read the source as it runs.

Cost: everything a framework would give for free is written by hand, including the animation clock, the layout and the routing.

## Accounts in an Organization, not one VPC

The first draft put every area of work in one VPC with subnets. It grew into one big box that hid where it started. One AWS account per area, joined by the Organization, is how a landing zone separates workloads, so the site's own structure follows the practice the projects use.

Cost: an account is not a network, so nothing inside an area is drawn as a subnet unless the project really has one.

## Draw each project from its own code

Every part in a detail was checked against the project's Terraform, compose files, Helm charts and scripts, and boundaries are drawn only where the code has them: real regions, VPCs and subnets only where they exist, and a Docker or kind boundary for work that never ran on AWS.

Cost: a detail can't be made to look bigger than the project is, and work that ran only on a laptop says so.

## One branch at a time

Going back takes away the branch the visitor left, so the drawing stays small and the camera can follow the visitor instead of trying to keep everything in view. An "Expand all" mode was built and then taken out.

Cost: comparing two projects side by side means going back and forth.

## Console pages generated from the repositories

The console pages are written by `build_console.py` from each repository's README and decisions record, not by hand, so they can't drift from the projects. They borrow the layout of the AWS console through the open-source Cloudscape patterns, without AWS's logo, name or typeface, and without made-up ARNs or account IDs.

Cost: a page is only as good as its repository's README, and the script has to be rerun when one changes.

## A text version generated from the same code

The drawing is hard to use with a screen reader and does nothing without JavaScript. `build_outline.mjs` runs the console's own page builders under Node and writes the same content as plain HTML into the page, and CI fails if it is out of date.

Cost: one more generated file to keep current.

## Tags taken from the repositories

Each project's tags come from what its repository really uses: Terraform resource types, AWS SDK clients, container images and package manifests. Search uses them to show every project that uses a service.

Cost: a tag list can't include a service the project only mentions.

## GitHub Pages now, CloudFront later

The site is on GitHub Pages for now, deployed by CI only after the tests pass. The "This site" detail draws the CloudFront move as planned, with a dashed line, rather than claiming it.

Cost: no access logs to feed the Edge Analytics pipeline until the move.

## Blueprint mode as the dark theme

The dark theme is a blueprint: white lines on blue, with the AWS category colours dropped, as a real blueprint is one colour. The line styles still tell the boundaries apart. It follows the visitor's system setting on the first visit and remembers their choice.

Cost: in blueprint mode storage and compute can't be told apart by colour.
