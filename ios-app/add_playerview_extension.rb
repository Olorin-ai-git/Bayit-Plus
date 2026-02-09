#!/usr/bin/env ruby
require 'xcodeproj'

project_path = 'BayitPlus.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BayitPlusApp' }

# Find the PlayerView file to get its group
player_view_file = project.files.find { |f| f.display_name == 'PlayerView.swift' }

if player_view_file
  # Get the parent group (should be Views/Player)
  parent_group = player_view_file.parent

  # Add the extension file
  file_ref = parent_group.new_file('PlayerView+SplitSubtitles.swift')

  # Add to build phase
  target.source_build_phase.add_file_reference(file_ref)

  puts "✓ Added PlayerView+SplitSubtitles.swift to project"
  puts "  Group: #{parent_group.hierarchy_path}"
else
  puts "✗ Could not find PlayerView.swift in project"
end

# Save the project
project.save

puts "\nProject updated successfully!"
