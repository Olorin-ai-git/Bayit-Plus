#!/usr/bin/env ruby
require 'xcodeproj'

project_path = 'BayitPlus.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BayitPlusApp' }

# Files that were incorrectly added (with duplicated paths)
files_with_bad_paths = [
  'BayitPlusApp/Repositories/BayitPlusApp/Repositories/SubtitleRepository+AIGeneration.swift',
  'BayitPlusApp/Views/Player/Subtitles/BayitPlusApp/Views/Player/Subtitles/AISubtitlesPickerView.swift',
  'BayitPlusApp/Views/Player/Subtitles/BayitPlusApp/Views/Player/Subtitles/SubtitlePaneView.swift',
  'BayitPlusApp/Views/Player/Subtitles/BayitPlusApp/Views/Player/Subtitles/SplitSubtitleOverlayView.swift',
  'BayitPlusApp/Views/Player/Subtitles/BayitPlusApp/Views/Player/Subtitles/SplitSubtitleLanguagePickerView.swift'
]

# Remove the incorrectly added files
files_with_bad_paths.each do |bad_path|
  file_ref = project.files.find { |f| f.path == bad_path }
  if file_ref
    file_ref.remove_from_project
    puts "Removed bad path: #{bad_path}"
  end
end

# Now add the files correctly with proper paths
correct_files = [
  {
    file_name: 'AISubtitlesPickerView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    file_name: 'SubtitlePaneView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    file_name: 'SplitSubtitleOverlayView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    file_name: 'SplitSubtitleLanguagePickerView.swift',
    group_path: ['BayitPlusApp', 'Views', 'Player', 'Subtitles']
  },
  {
    file_name: 'SubtitleRepository+AIGeneration.swift',
    group_path: ['BayitPlusApp', 'Repositories']
  }
]

correct_files.each do |file_info|
  # Get or create the group
  group = project.main_group
  file_info[:group_path].each do |group_name|
    group = group.groups.find { |g| g.name == group_name || g.path == group_name } ||
            group.new_group(group_name, group_name)
  end

  # Check if file already exists in the group
  existing_file = group.files.find { |f| f.path == file_info[:file_name] }

  if existing_file
    puts "File already in group: #{file_info[:file_name]}"
    # Make sure it's in the build phase
    unless target.source_build_phase.files_references.include?(existing_file)
      target.source_build_phase.add_file_reference(existing_file)
      puts "Added to build phase: #{file_info[:file_name]}"
    end
    next
  end

  # Add the file to the group (just the filename, not the full path)
  file_ref = group.new_file(file_info[:file_name])

  # Add to build phase
  target.source_build_phase.add_file_reference(file_ref)

  puts "Added correctly: #{file_info[:file_name]}"
end

# Save the project
project.save

puts "\nAll files fixed successfully!"
