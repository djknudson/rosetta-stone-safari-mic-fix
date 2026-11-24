import CoreAudio
import Foundation
func get<T>(_ id: AudioObjectID, _ sel: AudioObjectPropertySelector, _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal, _ def: T) -> T {
  var a = AudioObjectPropertyAddress(mSelector: sel, mScope: scope, mElement: kAudioObjectPropertyElementMain)
  var v = def; var sz = UInt32(MemoryLayout<T>.size)
  let e = AudioObjectGetPropertyData(id, &a, 0, nil, &sz, &v); return e == 0 ? v : def }
func str(_ id: AudioObjectID, _ sel: AudioObjectPropertySelector) -> String {
  var a = AudioObjectPropertyAddress(mSelector: sel, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
  var s: Unmanaged<CFString>?; var sz = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
  guard AudioObjectGetPropertyData(id, &a, 0, nil, &sz, &s) == 0, let r = s else { return "-" }; return r.takeRetainedValue() as String }
func list(_ sel: AudioObjectPropertySelector) -> [AudioObjectID] {
  var a = AudioObjectPropertyAddress(mSelector: sel, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
  var sz: UInt32 = 0; AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &a, 0, nil, &sz)
  var ids = [AudioObjectID](repeating: 0, count: Int(sz)/4); AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &a, 0, nil, &sz, &ids); return ids }
func fcc(_ v: UInt32) -> String { String(bytes: [24,16,8,0].map{UInt8((v >> $0) & 0xff)}, encoding: .ascii) ?? "?" }
print("== DEVICES (id | name | uid | transport | hidden | inputMute | inputVol)")
for d in list(kAudioHardwarePropertyDevices) {
  let t: UInt32 = get(d, kAudioDevicePropertyTransportType, kAudioObjectPropertyScopeGlobal, 0)
  let hid: UInt32 = get(d, kAudioDevicePropertyIsHidden, kAudioObjectPropertyScopeGlobal, 0)
  let m: UInt32 = get(d, kAudioDevicePropertyMute, kAudioObjectPropertyScopeInput, 99)
  let v: Float32 = get(d, kAudioDevicePropertyVolumeScalar, kAudioObjectPropertyScopeInput, -1)
  print(d, "|", str(d, kAudioObjectPropertyName), "|", str(d, kAudioDevicePropertyDeviceUID), "|", fcc(t), "| hidden=\(hid) | mute=\(m) | vol=\(v)") }
print("== PROCESSES WITH AUDIO I/O (pid | bundle | runningInput | runningOutput)")
for p in list(kAudioHardwarePropertyProcessObjectList) {
  let pid: pid_t = get(p, kAudioProcessPropertyPID, kAudioObjectPropertyScopeGlobal, 0)
  let ri: UInt32 = get(p, kAudioProcessPropertyIsRunningInput, kAudioObjectPropertyScopeGlobal, 0)
  let ro: UInt32 = get(p, kAudioProcessPropertyIsRunningOutput, kAudioObjectPropertyScopeGlobal, 0)
  if ri == 1 || ro == 1 { print(pid, "|", str(p, kAudioProcessPropertyBundleID), "| in=\(ri) out=\(ro)") } }
