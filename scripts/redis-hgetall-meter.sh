redis-cli hgetall 'lula:meter:counter:h'
redis-cli hgetall 'lula:meter:upDownCounter:h'
redis-cli hgetall 'lula:meter:counter:authenticate:h'
redis-cli hvals lula:meter:counter:authenticate:h | paste -sd+ - | bc
