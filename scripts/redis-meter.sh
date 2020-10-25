for key in `
  redis-cli keys 'lula:*:z'
`
do
  echo "#️⃣ ${key}"
  redis-cli zrevrange "${key}" 0 9 withscores
done

sum=`
  redis-cli zrevrange 'lula:meter:authenticate:counter:z' 0 9 | 
    xargs -n1 redis-cli zscore lula:meter:authenticate:counter:z | 
    paste -sd+ - | bc
`
total=`
  redis-cli --raw zscore 'lula:meter:counter:z' 'authenticate'
`
echo "INFO: sum=${sum}, total=${total}"
if [ ${sum} -ne ${total} ]
then
  echo "FAIL: ${sum} ne ${total}"
  exit 1 
fi

