require 'open3'

module Aruba
  class Process
    def initialize(cmd, exit_timeout, io_wait)
      @cmd = cmd
      @exit_timeout = exit_timeout
      @io_wait = io_wait
      @out = ""
      @err = ""
    end

    def run!(&block)
      @stdin, @stdout, @stderr, @thread = Open3.popen3(@cmd)
      yield self if block_given?
    end

    def stdin
      wait_for_io do
        @stdin
      end
    end

    def output(keep_ansi)
      stdout(keep_ansi) + stderr(keep_ansi)
    end

    def stdout(keep_ansi)
      wait_for_io do
        @out << @stdout.read
        filter_ansi(@out, keep_ansi)
      end
    end

    def stderr(keep_ansi)
      wait_for_io do
        @err << @stderr.read
        filter_ansi(@err, keep_ansi)
      end
    end

    def stop(keep_ansi)
      if @thread
        wait_for_exit
      end
    end

    private

    POLL_INTERVAL = 0.1
    def wait_for_exit
      end_time = Time.now + @exit_timeout
      until Time.now > end_time
        if not @thread.alive?
          return @thread.value.exitstatus
        end
        sleep POLL_INTERVAL
      end

      ::Process.kill(9, @thread[:pid]) rescue nil
      raise TimeoutError, "process still alive after #{@exit_timeout} seconds"
    end

    def wait_for_io(&block)
      sleep @io_wait if @thread.alive?
      yield
    end

    def filter_ansi(string, keep_ansi)
      keep_ansi ? string : string.gsub(/\e\[\d+(?>(;\d+)*)m/, '')
    end
  end
end
