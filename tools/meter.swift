import AVFoundation
let secs = Double(CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "3") ?? 3
let url = URL(fileURLWithPath: NSTemporaryDirectory() + "meter.caf")
let s: [String: Any] = [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 1]
let r = try! AVAudioRecorder(url: url, settings: s)
r.isMeteringEnabled = true
print("record started:", r.record())
let start = Date()
while Date().timeIntervalSince(start) < secs {
  Thread.sleep(forTimeInterval: 0.5); r.updateMeters()
  let f = DateFormatter(); f.dateFormat = "HH:mm:ss.S"
  print(f.string(from: Date()), String(format: "avg %.1f dB  peak %.1f dB", r.averagePower(forChannel: 0), r.peakPower(forChannel: 0)))
  fflush(stdout)
}
r.stop()
