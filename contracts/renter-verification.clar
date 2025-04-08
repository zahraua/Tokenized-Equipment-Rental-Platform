;; Renter Verification Contract
;; Validates qualified business customers

;; Verification status
(define-map verified-renters
  { renter: principal }
  {
    business-name: (string-ascii 64),
    business-id: (string-ascii 32),
    is-verified: bool,
    verification-date: uint,
    last-updated: uint
  }
)

;; Admin principal that can verify renters
(define-data-var contract-admin principal tx-sender)

;; Function to change admin (only current admin can call)
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) (err u403))
    (var-set contract-admin new-admin)
    (ok true)
  )
)

;; Request verification (submitted by renter)
(define-public (request-verification (business-name (string-ascii 64)) (business-id (string-ascii 32)))
  (begin
    (asserts! (> (len business-name) u0) (err u1))
    (asserts! (> (len business-id) u0) (err u2))

    (map-set verified-renters
      { renter: tx-sender }
      {
        business-name: business-name,
        business-id: business-id,
        is-verified: false,
        verification-date: u0,
        last-updated: block-height
      }
    )

    (ok true)
  )
)

;; Approve renter verification (admin only)
(define-public (approve-verification (renter principal))
  (let
    (
      (verification-data (unwrap! (map-get? verified-renters { renter: renter }) (err u404)))
    )
    ;; Only admin can approve verification
    (asserts! (is-eq tx-sender (var-get contract-admin)) (err u403))

    ;; Update verification status
    (map-set verified-renters
      { renter: renter }
      (merge verification-data
        {
          is-verified: true,
          verification-date: block-height,
          last-updated: block-height
        }
      )
    )

    (ok true)
  )
)

;; Revoke verification (admin only)
(define-public (revoke-verification (renter principal))
  (let
    (
      (verification-data (unwrap! (map-get? verified-renters { renter: renter }) (err u404)))
    )
    ;; Only admin can revoke verification
    (asserts! (is-eq tx-sender (var-get contract-admin)) (err u403))

    ;; Update verification status
    (map-set verified-renters
      { renter: renter }
      (merge verification-data
        {
          is-verified: false,
          last-updated: block-height
        }
      )
    )

    (ok true)
  )
)

;; Check if a renter is verified
(define-read-only (is-verified (renter principal))
  (default-to
    false
    (get is-verified (map-get? verified-renters { renter: renter }))
  )
)

;; Get verification details
(define-read-only (get-verification-details (renter principal))
  (map-get? verified-renters { renter: renter })
)
