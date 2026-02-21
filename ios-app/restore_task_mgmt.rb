#!/usr/bin/env ruby
require "xcodeproj"
require "pathname"

PROJECT_PATH = "BayitPlus.xcodeproj"
project = Xcodeproj::Project.open(PROJECT_PATH)
project_root = Pathname.new(File.dirname(File.expand_path(PROJECT_PATH)))

ios_target = project.targets.find { |t| t.name == "BayitPlusApp" }
tv_target = project.targets.find { |t| t.name == "BayitPlusTVApp" }

all_refs = {}
project.files.each do |ref|
  next unless ref.path&.end_with?(".swift")
  rp = ref.real_path.to_s rescue nil
  all_refs[rp] = ref if rp
end

# Collect group cache
group_cache = {}
def walk_groups(group, parent_path, cache)
  if group.path && !group.path.empty?
    current = parent_path ? File.join(parent_path, group.path) : group.path
  else
    current = parent_path
  end
  cache[current] = group if current
  group.groups.each { |child| walk_groups(child, current, cache) }
end
project.main_group.groups.each { |g| walk_groups(g, nil, group_cache) }

file_to_restore = "BayitPlusApp/Services/DownloadManager+TaskManagement.swift"
full_path = project_root.join(file_to_restore).to_s

[ios_target, tv_target].each do |target|
  phase = target.source_build_phase
  already = phase.files.any? do |bf|
    rp = bf.file_ref&.real_path.to_s rescue nil
    rp&.end_with?("DownloadManager+TaskManagement.swift")
  end

  if already
    puts "Already in #{target.name}"
    next
  end

  file_ref = all_refs[full_path]
  unless file_ref
    # Create new reference
    rel_path = Pathname.new(full_path).relative_path_from(project_root).to_s
    dir_path = File.dirname(rel_path)
    file_name = File.basename(rel_path)
    group = group_cache[dir_path]
    unless group
      puts "ERROR: No group for #{dir_path}"
      next
    end
    file_ref = group.new_reference(file_name)
    file_ref.source_tree = "<group>"
    all_refs[full_path] = file_ref
    puts "Created new ref"
  end

  phase.add_file_reference(file_ref, true)
  puts "Added to #{target.name}"
end

project.save
puts "Project saved."
