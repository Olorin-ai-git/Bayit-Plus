#!/usr/bin/env ruby

require 'xcodeproj'

PROJECT_PATH = File.expand_path('../../tvos/BayitPlusTVOS.xcodeproj', __FILE__)
project = Xcodeproj::Project.open(PROJECT_PATH)

target = project.targets.find { |t| t.name == 'BayitPlusTVOS' }

if target.nil?
  puts "❌ Error: Could not find BayitPlusTVOS target"
  exit 1
end

puts "🔧 Configuring tvOS Xcode project for Apple Sign-In..."
puts ""

# Get the main group
main_group = project.main_group.find_subpath('BayitPlusTVOS', true)

# Files to add
files_to_add = [
  'tvos/BayitPlusTVOS/AppleAuthModule.swift',
  'tvos/BayitPlusTVOS/AppleAuthModule.m',
  'tvos/BayitPlusTVOS/BayitPlusTVOS-Bridging-Header.h'
]

added_files = []

files_to_add.each do |file_path|
  file_name = File.basename(file_path)

  # Check if file already exists in project
  existing_file = main_group.files.find { |f| f.path == file_name }

  if existing_file
    puts "⏭️  File already in project: #{file_name}"
    next
  end

  # Add file reference
  file_ref = main_group.new_reference(file_name)

  # Add to build phase only for .swift and .m files
  if file_name.end_with?('.swift', '.m')
    target.source_build_phase.add_file_reference(file_ref)
    puts "✅ Added #{file_name} to project and build phase"
  else
    puts "✅ Added #{file_name} to project"
  end

  added_files << file_name
end

# Configure build settings
puts ""
puts "🔧 Configuring build settings..."

target.build_configurations.each do |config|
  # Set bridging header
  config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] = 'BayitPlusTVOS/BayitPlusTVOS-Bridging-Header.h'

  # Set code signing entitlements
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'BayitPlusTVOS/BayitPlusTVOS.entitlements'

  puts "✅ Updated #{config.name} configuration"
end

# Save the project
puts ""
puts "💾 Saving project..."
project.save

puts ""
puts "✅ tvOS Xcode project configured successfully!"
puts ""
puts "⚠️  IMPORTANT: You still need to manually add the capability:"
puts ""
puts "1. Open Xcode:"
puts "   open '#{PROJECT_PATH}'"
puts ""
puts "2. Select 'BayitPlusTVOS' target → 'Signing & Capabilities' tab"
puts "3. Click '+ Capability'"
puts "4. Add 'Sign In with Apple'"
puts ""
puts "5. Clean build folder (Cmd+Shift+K) and rebuild"
puts ""
puts "📱 After completing these steps, test Apple Sign-In on the tvOS simulator!"
puts ""
