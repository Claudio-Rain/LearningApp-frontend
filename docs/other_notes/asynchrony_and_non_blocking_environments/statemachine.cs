
class FetchAndProcessAsyncStateMachine {
    int _state = 0;
    string _url;
    string _data;         // variable local "data" vive aquí
    TaskCompletionSource _tcs;

    void MoveNext() {
        if (_state == 0) {
            _state = 1;
            var task = FetchAsync(_url);
            task.ContinueWith(_ => MoveNext());  // registra el callback
            return;  // ← thread liberado aquí
        }
        if (_state == 1) {
            // continuación: retomamos aquí
            var processed = Process(_data);
            _tcs.SetResult(processed);
        }
    }
}