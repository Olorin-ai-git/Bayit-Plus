#!/usr/bin/env ruby
# Configure tvOS Xcode project with native modules and frameworks
# Run: ruby scripts/configure-xcode-project.rb

require 'xcodeproj'

TVOS_DIR = File.expand_path('../tvos', __dir__)
PROJECT_PATH = File.join(TVOS_DIR, 'BayitPlusTVOS.xcodeproj')
SOURCE_DIR = File.join(TVOS_DIR, 'BayitPlusTVOS')

# Swift files to add
SWIFT_FILES = %w[
  SpeechModule.swift
  TTSModule.swift
  AudioSessionManager.swift
  TopShelfProvider.swift
  SceneSearchIntentHandler.swift
]

# Objective-C files to add
OBJC_FILES = %w[
  SpeechModule.m
  TTSModule.m
  AudioSessionManager.m
]

# Frameworks to link
FRAMEWORKS = %w[
  Speech.framework
  AVFoundation.framework
  MediaPlayer.framework
  TVServices.framework
  Intents.framework
]

def main
  puts "🔧 Configuring tvOS Xcode project..."
  puts ""

  # Open project
  project = Xcodeproj::Project.open(PROJECT_PATH)
  target = project.targets.find { |t| t.name == 'BayitPlusTVOS' }

  unless target
    puts "❌ Target 'BayitPlusTVOS' not found"
    exit 1
  end

  # Find or create the source group
  main_group = project.main_group.find_subpath('BayitPlusTVOS', true)

  # Add Swift files
  puts "📄 Adding Swift files..."
  SWIFT_FILES.each do |filename|
    file_path = File.join(SOURCE_DIR, filename)
    if File.exist?(file_path)
      # Check if already in project
      existing = main_group.files.find { |f| f.path == filename }
      unless existing
        file_ref = main_group.new_file(file_path)
        target.add_file_references([file_ref])
        puts "   ✅ Added #{filename}"
      else
        puts "   ⏭️  #{filename} already in project"
      end
    else
      puts "   ⚠️  #{filename} not found at #{file_path}"
    end
  end

  # Add Objective-C files
  puts ""
  puts "📄 Adding Objective-C files..."
  OBJC_FILES.each do |filename|
    file_path = File.join(SOURCE_DIR, filename)
    if File.exist?(file_path)
      existing = main_group.files.find { |f| f.path == filename }
      unless existing
        file_ref = main_group.new_file(file_path)
        target.add_file_references([file_ref])
        puts "   ✅ Added #{filename}"
      else
        puts "   ⏭️  #{filename} already in project"
      end
    else
      puts "   ⚠️  #{filename} not found (may not be required)"
    end
  end

  # Add frameworks
  puts ""
  puts "🔗 Linking frameworks..."
  frameworks_group = project.main_group.find_subpath('Frameworks', true) ||
                     project.main_group.new_group('Frameworks')

  FRAMEWORKS.each do |framework_name|
    # Check if already linked
    existing = target.frameworks_build_phase.files.find do |f|
      f.file_ref&.path == framework_name
    end

    unless existing
      framework_ref = project.frameworks_group.new_file("System/Library/Frameworks/#{framework_name}")
      target.frameworks_build_phase.add_file_reference(framework_ref)
      puts "   ✅ Linked #{framework_name}"
    else
      puts "   ⏭️  #{framework_name} already linked"
    end
  end

  # Configure build settings
  puts ""
  puts "⚙️  Configuring build settings..."

  target.build_configurations.each do |config|
    # Enable modules
    config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
    # Swift compatibility header
    config.build_settings['SWIFT_INSTALL_OBJC_HEADER'] = 'YES'
    # Defines module
    config.build_settings['DEFINES_MODULE'] = 'YES'
  end
  puts "   ✅ Build settings configured"

  # Save project
  puts ""
  puts "💾 Saving project..."
  project.save
  puts "   ✅ Project saved"

  puts ""
  puts "✅ Configuration complete!"
  puts ""
  puts "Next steps:"
  puts "1. Open Xcode: open #{PROJECT_PATH.gsub('.xcodeproj', '.xcworkspace')}"
  puts "2. Build the project: ⌘B"
  puts "3. Run on simulator: npx react-native run-ios --simulator='Apple TV 4K'"
  puts ""
end

begin
  main
rescue LoadError => e
  puts "❌ Error: xcodeproj gem not installed"
  puts ""
  puts "Install with: gem install xcodeproj"
  puts ""
  exit 1
rescue => e
  puts "❌ Error: #{e.message}"
  puts e.backtrace.first(5).join("\n")
  exit 1
end
