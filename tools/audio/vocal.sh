#!/usr/bin/env bash
# Ravi's sung hook -> the game's vocal track. Plain audio effects only (no AI): trims the four phrases, cleans, compresses,
# adds grunge drive, a doubled voice, an eighth-note slap and a short room, and lays each phrase on its own two-bar slot
# (3.75 s at 128 BPM) so the music can drop any phrase on a bar line. Output: one mono AAC file, phrase k at k * 3.75 s.
# usage: tools/audio/vocal.sh input.m4a out.m4a  (phrase starts in seconds can be overridden with STARTS="0.3 4.08 8.02 11.7")
set -euo pipefail
IN="$1"; OUT="$2"; STARTS=${STARTS:-"0.3 4.08 8.02 11.7"}; SLOT=3.75
TMP=$(mktemp -d); i=0
for s in $STARTS; do
  ffmpeg -v error -y -ss "$(python3 -c "print(max(0,$s-0.04))")" -t 3.7 -i "$IN" -ac 1 -ar 48000 \
    -af "highpass=f=95,lowpass=f=12000,afftdn=nr=12:nf=-32,equalizer=f=260:t=q:w=1:g=-3,equalizer=f=3200:t=q:w=1.2:g=4,acompressor=threshold=0.07:ratio=4:attack=5:release=120:makeup=3,volume=2.2,asoftclip=type=tanh,chorus=0.75:0.9:22|31:0.32|0.28:0.3|0.45:2|1.4,aecho=0.85:0.55:234:0.2,aecho=0.85:0.35:41|67|97:0.16|0.12|0.08,afade=t=in:d=0.01,afade=t=out:st=3.55:d=0.15,apad=whole_dur=$SLOT,atrim=0:$SLOT" \
    "$TMP/p$i.wav"; i=$((i+1))
done
ls "$TMP"/p*.wav | sort | sed "s/^/file '/;s/$/'/" > "$TMP/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/list.txt" -af "loudnorm=I=-14:TP=-1.5:LRA=7" -ar 44100 -c:a aac -b:a 80k "$OUT"
rm -rf "$TMP"
