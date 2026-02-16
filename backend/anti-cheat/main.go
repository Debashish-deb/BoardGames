package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type AntiCheatSignal struct {
	GameID     string                 `json:"gameId"`
	PlayerID   string                 `json:"playerId"`
	MoveNumber int                    `json:"moveNumber"`
	Code       string                 `json:"code"`
	Severity   string                 `json:"severity"`
	Description string                `json:"description"`
	Metadata   map[string]interface{} `json:"metadata"`
}

func main() {
	http.HandleFunc("/anti-cheat/signal", handleSignal)
	log.Println("Anti-cheat service running on :8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}

func handleSignal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var signal AntiCheatSignal
	if err := json.NewDecoder(r.Body).Decode(&signal); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	log.Printf("[%s] Anti-cheat %s from player %s (move %d)", time.Now().Format(time.RFC3339), signal.Code, signal.PlayerID, signal.MoveNumber)
	w.WriteHeader(http.StatusAccepted)
}
