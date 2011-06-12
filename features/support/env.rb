require 'bundler'
Bundler.setup

require 'aruba/cucumber'

Before do
  root_path = File.expand_path('../../..', __FILE__)

  bin_path = File.expand_path('bin', root_path)
  ENV['PATH'] = bin_path << File::PATH_SEPARATOR << ENV['PATH']

  ENV['NODE_PATH'] = root_path << File::PATH_SEPARATOR << ENV['NODE_PATH']

  if ENV['announce']
    @announce_stdout = true
    @announce_stderr = true
    @announce_cmd = true
    @announce_dir = true
    @announce_env = true
  end
end

Before '@slow' do
  @aruba_timeout_seconds = 10
end
