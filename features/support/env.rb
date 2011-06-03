require 'bundler'
Bundler.setup

require 'aruba/cucumber'

Before do
  root_path = File.expand_path('../../..', __FILE__)

  bin_path = File.expand_path('bin', root_path)
  ENV['PATH'] = bin_path << File::PATH_SEPARATOR << ENV['PATH']

  ENV['NODE_PATH'] = root_path << File::PATH_SEPARATOR << ENV['NODE_PATH']
end
