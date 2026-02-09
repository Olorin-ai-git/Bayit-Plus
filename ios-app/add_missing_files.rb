#!/usr/bin/env ruby
require 'xcodeproj'

project_path = 'BayitPlus.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BayitPlusApp' }

# Files to add
files_to_add = [
  {
    path: 'BayitPlusApp/Views/Player/Subtitles/AISubtitlesPickerView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    path: 'BayitPlusApp/Views/Player/Subtitles/SubtitlePaneView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    path: 'BayitPlusApp/Views/Player/Subtitles/SplitSubtitleOverlayView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    path: 'BayitPlusApp/Views/Player/Subtitles/SplitSubtitleLanguagePickerView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    path: 'BayitPlusApp/Repositories/SubtitleRepository+AIGeneration.swift',
    group_path: ['BayitPlusApp', 'Repositories']
  }
]

files_to_add.each do |file_info|
  file_path = file_info[:path]

  # Check if file already exists in project
  existing_file = project.files.find { |f| f.path == file_path }

  if existing_file
    puts "File already in project: #{file_path}"
    next
  end

  # Get or create the group
  group = project.main_group
  file_info[:group_path].each do |group_name|
    group = group.groups.find { |g| g.name == group_name || g.path == group_name } ||
            group.new_group(group_name, group_name)
  end

  # Add the file to the group
  file_ref = group.new_file(file_path)

  # Add to build phase
  target.source_build_phase.add_file_reference(file_ref)

  puts "Added: #{file_path}"
end

# Save the project
project.save

puts "\nAll files added successfully!"
